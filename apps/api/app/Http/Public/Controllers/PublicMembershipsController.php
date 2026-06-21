<?php

declare(strict_types=1);

namespace App\Http\Public\Controllers;

use App\Domain\Billing\Models\MagicLink;
use App\Domain\Identity\Models\User;
use App\Domain\Memberships\Models\ClientMembership;
use App\Domain\Memberships\Models\Membership;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/**
 * Suscripción a membresías desde el portal cliente (/me).
 *
 *  POST /api/public/me/memberships         { token }      → planes + mi membership
 *  POST /api/public/me/memberships/checkout { token, membership_id } → Stripe Checkout
 *
 * El `token` es el mismo magic link emitido por ClientPortalController.
 * Sigue siendo válido por 30 min sin marcar `used_at`.
 */
final class PublicMembershipsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (! $user instanceof User) return $user;

        $tenant = Tenant::query()->withoutGlobalScopes()->find($user->tenant_id);
        if (! $tenant) return response()->json(['error' => 'tenant_not_found'], 404);

        $plans = Membership::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->orderBy('price_cents')
            ->get();

        $current = ClientMembership::query()
            ->where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->whereIn('status', ['active', 'pending'])
            ->with('membership')
            ->latest()
            ->first();

        return response()->json([
            'tenant' => ['slug' => $tenant->slug, 'name' => $tenant->name],
            'plans'  => $plans->map(fn (Membership $m) => [
                'id'                          => $m->id,
                'name'                        => $m->name,
                'price_cents'                 => $m->price_cents,
                'currency'                    => $m->currency,
                'included_services_per_month' => $m->included_services_per_month,
            ]),
            'current' => $current ? [
                'id'                        => $current->id,
                'plan_name'                 => $current->membership?->name,
                'plan_id'                   => $current->membership_id,
                'services_used_this_period' => $current->services_used_this_period,
                'services_included'         => $current->membership?->included_services_per_month,
                'current_period_ends_on'    => $current->current_period_ends_on?->toDateString(),
                'status'                    => $current->status,
            ] : null,
        ]);
    }

    public function checkout(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (! $user instanceof User) return $user;

        $data = $request->validate([
            'token'         => ['required', 'string', 'min:32'],
            'membership_id' => ['required', 'integer'],
        ]);

        $plan = Membership::query()
            ->where('tenant_id', $user->tenant_id)
            ->where('is_active', true)
            ->find($data['membership_id']);
        if (! $plan) return response()->json(['error' => 'plan_not_found'], 404);

        $existing = ClientMembership::query()
            ->where('tenant_id', $user->tenant_id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();
        if ($existing) return response()->json(['error' => 'already_subscribed'], 409);

        $tenant = Tenant::query()->withoutGlobalScopes()->find($user->tenant_id);
        $frontend = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/');
        $successUrl = "{$frontend}/me?token={$data['token']}&membership=success";
        $cancelUrl  = "{$frontend}/me?token={$data['token']}&membership=cancelled";

        $driver = config('services.stripe.driver', env('STRIPE_DRIVER', 'mock'));
        $isMock = $driver === 'mock' || ! config('services.stripe.secret');

        if ($isMock) {
            $cm = ClientMembership::create([
                'tenant_id'                 => $user->tenant_id,
                'user_id'                   => $user->id,
                'membership_id'             => $plan->id,
                'services_used_this_period' => 0,
                'current_period_starts_on'  => today(),
                'current_period_ends_on'    => today()->addMonth(),
                'status'                    => 'active',
                'stripe_subscription_id'    => 'sub_mock_' . strtoupper(\Illuminate\Support\Str::random(10)),
            ]);
            return response()->json([
                'session_id'           => 'cs_mock_membership_' . $cm->id,
                'url'                  => $successUrl,
                'client_membership_id' => $cm->id,
            ]);
        }

        // Stripe real — webhook crea ClientMembership al recibir checkout.session.completed.
        $secret = (string) config('services.stripe.secret');
        $response = Http::asForm()->withBasicAuth($secret, '')
            ->post('https://api.stripe.com/v1/checkout/sessions', [
                'mode'           => 'subscription',
                'success_url'    => $successUrl,
                'cancel_url'     => $cancelUrl,
                'customer_email' => $user->email,
                'line_items[0][price_data][currency]'                       => strtolower($plan->currency),
                'line_items[0][price_data][unit_amount]'                    => $plan->price_cents,
                'line_items[0][price_data][recurring][interval]'            => 'month',
                'line_items[0][price_data][product_data][name]'             => $plan->name . ' · ' . ($tenant->name ?? ''),
                'line_items[0][quantity]'                                   => 1,
                'metadata[purpose]'         => 'membership_subscription',
                'metadata[user_id]'         => (string) $user->id,
                'metadata[membership_id]'   => (string) $plan->id,
                'metadata[tenant_id]'       => $user->tenant_id,
            ]);

        if ($response->failed()) {
            logger()->warning('Stripe membership checkout failed', ['body' => $response->body()]);
            return response()->json(['error' => 'stripe_failed'], 502);
        }
        $body = $response->json();
        return response()->json([
            'session_id' => (string) ($body['id'] ?? ''),
            'url'        => (string) ($body['url'] ?? ''),
        ]);
    }

    /**
     * @return User|JsonResponse  Devuelve User válido o un JsonResponse de error.
     */
    private function resolveUser(Request $request)
    {
        $token = $request->input('token');
        if (! is_string($token) || strlen($token) < 32) {
            return response()->json(['error' => 'invalid_token'], 401);
        }

        $link = MagicLink::findValidByToken($token, 'client_portal');
        if (! $link) return response()->json(['error' => 'invalid_or_expired'], 410);

        $user = User::query()->withoutGlobalScopes()->find($link->user_id);
        if (! $user) return response()->json(['error' => 'user_not_found'], 404);
        return $user;
    }
}

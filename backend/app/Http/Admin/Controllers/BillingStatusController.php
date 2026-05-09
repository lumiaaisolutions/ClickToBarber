<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Billing\Models\Subscription;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/**
 * GET /api/admin/billing/status
 * Devuelve la suscripción activa del tenant + plan actual + próxima factura.
 */
final class BillingStatusController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function __invoke(): JsonResponse
    {
        $tenant = $this->current->require();
        $sub = Subscription::query()
            ->where('tenant_id', $tenant->id)
            ->whereIn('status', ['active', 'trialing', 'past_due'])
            ->latest('id')->first();

        $plan = Plan::query()->find($tenant->plan_id);

        return response()->json([
            'tenant' => [
                'id'   => $tenant->id,
                'slug' => $tenant->slug,
                'plan_status' => $tenant->plan_status,
                'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
            ],
            'plan' => $plan ? [
                'id'   => $plan->id,
                'code' => $plan->code,
                'name' => $plan->name,
                'price_cents' => $plan->price_cents,
                'features'    => $plan->features,
            ] : null,
            'subscription' => $sub ? [
                'id'              => $sub->id,
                'status'          => $sub->status,
                'billing_cycle'   => $sub->billing_cycle,
                'period_starts'   => $sub->current_period_starts_at?->toIso8601String(),
                'period_ends'     => $sub->current_period_ends_at?->toIso8601String(),
                'trial_ends_at'   => $sub->trial_ends_at?->toIso8601String(),
                'has_stripe'      => (bool) $sub->stripe_subscription_id,
            ] : null,
        ]);
    }
}

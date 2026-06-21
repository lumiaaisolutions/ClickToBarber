<?php

declare(strict_types=1);

namespace App\Http\Public\Controllers;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use App\Domain\Billing\Models\MagicLink;
use App\Domain\Engagement\Models\Rating;
use App\Domain\Growth\Models\LoyaltyReward;
use App\Domain\Growth\Models\LoyaltyVisit;
use App\Domain\Growth\Models\Referral;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

/**
 * Mini portal del cliente final ("Mi cuenta").
 *
 *  POST /api/public/me/login         { email, tenant_slug } → emite magic link.
 *  POST /api/public/me/consume       { token } → devuelve datos del cliente.
 *
 * El cliente NO necesita password — el magic link al email es suficiente.
 * Cada link es de un solo uso y dura 30 min.
 */
final class ClientPortalController extends Controller
{
    public function requestLogin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'       => ['required', 'email'],
            'tenant_slug' => ['required', 'string'],
        ]);

        $tenant = Tenant::query()->withoutGlobalScopes()->where('slug', $data['tenant_slug'])->first();
        if (! $tenant) {
            return response()->json(['error' => 'tenant_not_found'], 404);
        }

        $user = User::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('email', strtolower($data['email']))
            ->where('role', User::ROLE_CLIENT)
            ->first();

        // No revelamos si el email existe o no — siempre devolvemos 200.
        if ($user) {
            [, $token] = MagicLink::issue(
                $user,
                'client_portal',
                30, // 30 min
            );

            // Mail genérico — en producción conviene un Mailable dedicado.
            try {
                Mail::raw(
                    "Hola {$user->name},\n\nAccede a tu cuenta de {$tenant->name}: "
                    . rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/')
                    . "/me?token={$token}\n\nEl enlace expira en 30 min.",
                    fn ($m) => $m->to($user->email)->subject("Acceso a tu cuenta · {$tenant->name}"),
                );
            } catch (\Throwable $e) {
                logger()->warning('Client portal mail falló', ['err' => $e->getMessage()]);
            }
        }

        return response()->json(['ok' => true, 'message' => 'Si el email existe, recibirás un correo en breve.']);
    }

    public function consume(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'string', 'min:32']]);

        $link = MagicLink::findValidByToken($data['token'], 'client_portal');
        if (! $link) {
            return response()->json(['error' => 'invalid_or_expired'], 410);
        }

        $user = User::query()->withoutGlobalScopes()->find($link->user_id);
        if (! $user) {
            return response()->json(['error' => 'user_not_found'], 404);
        }

        // No marcamos used_at en cada visita — el link sigue válido por 30 min
        // para refrescos. Cuando expire, expira.

        return response()->json([
            'client' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ],
            'appointments' => Appointment::query()
                ->withoutGlobalScopes()
                ->where('client_id', $user->id)
                ->whereIn('status', [
                    AppointmentStatus::PendingConfirmation->value,
                    AppointmentStatus::Confirmed->value,
                    AppointmentStatus::Completed->value,
                ])
                ->orderByDesc('starts_at')
                ->limit(20)
                ->with(['service:id,name', 'barber:id,name'])
                ->get()
                ->map(fn (Appointment $a) => [
                    'id'         => $a->id,
                    'starts_at'  => $a->starts_at->toIso8601String(),
                    'service'    => $a->service?->name,
                    'barber'     => $a->barber?->name,
                    'status'     => $a->status->value,
                ]),
            'rewards' => LoyaltyReward::query()
                ->where('user_id', $user->id)
                ->whereNull('redeemed_at')
                ->where(function ($q) { $q->whereNull('expires_at')->orWhere('expires_at', '>', now()); })
                ->get(['code', 'reward_type', 'reward_value', 'reward_label', 'expires_at']),
            'visits_credited' => LoyaltyVisit::query()
                ->where('user_id', $user->id)->count(),
            'referral_code' => optional(
                Referral::query()
                    ->where('referrer_user_id', $user->id)
                    ->where('status', Referral::STATUS_PENDING)
                    ->latest()->first()
            )->code,
        ]);
    }
}

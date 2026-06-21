<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Audit\PiiAccessLogger;
use App\Domain\Engagement\Models\Rating;
use App\Domain\Growth\Models\LoyaltyReward;
use App\Domain\Growth\Models\LoyaltyVisit;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/**
 * GET /api/admin/clients/{id}/timeline
 * Timeline visual del cliente: citas, ratings, recompensas, visitas
 * acreditadas. Útil para "este cliente vino N veces, gastó X, último
 * corte fue tal día".
 */
final class ClientTimelineController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function __invoke(int $userId): JsonResponse
    {
        $tenant = $this->current->require();

        $user = User::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('id', $userId)
            ->where('role', User::ROLE_CLIENT)
            ->firstOrFail();

        $appointments = Appointment::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('client_id', $user->id)
            ->with(['barber:id,name', 'service:id,name'])
            ->orderByDesc('starts_at')
            ->limit(50)
            ->get();

        $stats = [
            'total_visits'    => $appointments->where('status.value', 'completed')->count(),
            'total_spent_cents' => (int) $appointments->where('status.value', 'completed')->sum('price_cents'),
            'first_visit'     => $appointments->last()?->starts_at?->toIso8601String(),
            'last_visit'      => $user->last_visit_at?->toIso8601String(),
            'favorite_barber' => $appointments->where('status.value', 'completed')
                ->groupBy('barber_id')->map->count()->sortDesc()->keys()->first(),
            'visits_credited' => LoyaltyVisit::query()->where('user_id', $user->id)->where('tenant_id', $tenant->id)->count(),
        ];

        $rewards = LoyaltyReward::query()
            ->where('user_id', $user->id)
            ->orderByDesc('issued_at')
            ->get(['code', 'reward_type', 'reward_value', 'issued_at', 'expires_at', 'redeemed_at']);

        $ratings = Rating::query()
            ->where('user_id', $user->id)
            ->whereNotNull('submitted_at')
            ->orderByDesc('submitted_at')
            ->get(['stars', 'comment', 'submitted_at']);

        PiiAccessLogger::log('admin.clients.timeline', User::class, (string) $user->id, 1);

        return response()->json([
            'client' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'phone' => $user->phone, // descifrado por cast
            ],
            'stats'        => $stats,
            'appointments' => $appointments->map(fn (Appointment $a) => [
                'id'          => $a->id,
                'starts_at'   => $a->starts_at->toIso8601String(),
                'status'      => $a->status->value,
                'service'     => $a->service?->name,
                'barber'      => $a->barber?->name,
                'price_cents' => $a->price_cents,
            ]),
            'rewards' => $rewards,
            'ratings' => $ratings,
        ]);
    }
}

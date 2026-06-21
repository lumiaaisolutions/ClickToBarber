<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Growth\Models\LoyaltyProgram;
use App\Domain\Growth\Models\LoyaltyReward;
use App\Domain\Growth\Models\LoyaltyVisit;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class LoyaltyController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    /**
     * GET /api/admin/loyalty
     * Devuelve config + KPIs (recompensas activas, redimidas, top clientes).
     */
    public function show(): JsonResponse
    {
        $tenant = $this->current->require();

        $program = LoyaltyProgram::query()
            ->where('tenant_id', $tenant->id)
            ->first()
            ?: LoyaltyProgram::create([
                'tenant_id'      => $tenant->id,
                'is_active'      => false,
                'every_n_visits' => 10,
                'reward_type'    => LoyaltyProgram::TYPE_FREE_SERVICE,
                'reward_value'   => 100,
                'reward_label'   => 'Corte gratis',
                'expiry_days'    => 180,
            ]);

        $rewardsActive = LoyaltyReward::query()
            ->where('tenant_id', $tenant->id)
            ->whereNull('redeemed_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->count();

        $rewardsRedeemed = LoyaltyReward::query()
            ->where('tenant_id', $tenant->id)
            ->whereNotNull('redeemed_at')
            ->count();

        $totalVisits = LoyaltyVisit::query()
            ->where('tenant_id', $tenant->id)
            ->count();

        return response()->json([
            'program' => [
                'is_active'      => $program->is_active,
                'every_n_visits' => $program->every_n_visits,
                'reward_type'    => $program->reward_type,
                'reward_value'   => $program->reward_value,
                'reward_label'   => $program->reward_label,
                'expiry_days'    => $program->expiry_days,
            ],
            'kpis' => [
                'rewards_active'    => $rewardsActive,
                'rewards_redeemed'  => $rewardsRedeemed,
                'visits_credited'   => $totalVisits,
            ],
        ]);
    }

    /**
     * PUT /api/admin/loyalty
     */
    public function update(Request $request): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();

        $data = $request->validate([
            'is_active'      => ['required', 'boolean'],
            'every_n_visits' => ['required', 'integer', 'min:2', 'max:50'],
            'reward_type'    => ['required', 'string', 'in:discount_pct,free_service'],
            'reward_value'   => ['required', 'integer', 'min:1', 'max:100'],
            'reward_label'   => ['nullable', 'string', 'max:120'],
            'expiry_days'    => ['required', 'integer', 'min:0', 'max:365'],
        ]);

        $program = LoyaltyProgram::query()
            ->updateOrCreate(['tenant_id' => $tenant->id], $data);

        return response()->json(['ok' => true, 'program' => $program]);
    }

    /**
     * GET /api/admin/loyalty/rewards
     */
    public function rewards(): JsonResponse
    {
        $tenant = $this->current->require();

        $rewards = LoyaltyReward::query()
            ->where('tenant_id', $tenant->id)
            ->with('user:id,name,email,phone')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return response()->json($rewards->map(fn (LoyaltyReward $r) => [
            'id'            => $r->id,
            'code'          => $r->code,
            'reward_type'   => $r->reward_type,
            'reward_value'  => $r->reward_value,
            'reward_label'  => $r->reward_label,
            'user'          => $r->user ? ['id' => $r->user->id, 'name' => $r->user->name, 'email' => $r->user->email] : null,
            'issued_at'     => $r->issued_at?->toIso8601String(),
            'expires_at'    => $r->expires_at?->toIso8601String(),
            'redeemed_at'   => $r->redeemed_at?->toIso8601String(),
            'usable'        => $r->isUsable(),
        ]));
    }

    private function guardWrite(Request $request): void
    {
        $u = $request->user();
        if (! $u || ! $u->canWrite()) {
            abort(response()->json(['error' => 'role_forbidden'], 403));
        }
    }
}

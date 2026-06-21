<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Growth\Models\Referral;
use App\Domain\Growth\Services\IssueReferral;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ReferralController extends Controller
{
    public function __construct(
        private CurrentTenant $current,
        private IssueReferral $issue,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenant = $this->current->require();
        $status = (string) $request->query('status', '');

        $q = Referral::query()
            ->where('tenant_id', $tenant->id)
            ->with(['referrer:id,name,email', 'referred:id,name,email'])
            ->orderByDesc('id');

        if ($status !== '') {
            $q->where('status', $status);
        }

        $rows = $q->limit(100)->get();

        $kpis = [
            'pending'   => Referral::query()->where('tenant_id', $tenant->id)->where('status', Referral::STATUS_PENDING)->count(),
            'signed_up' => Referral::query()->where('tenant_id', $tenant->id)->where('status', Referral::STATUS_SIGNED_UP)->count(),
            'completed' => Referral::query()->where('tenant_id', $tenant->id)->where('status', Referral::STATUS_COMPLETED)->count(),
        ];

        return response()->json([
            'kpis'      => $kpis,
            'referrals' => $rows->map(fn (Referral $r) => [
                'id'              => $r->id,
                'code'            => $r->code,
                'status'          => $r->status,
                'referrer'        => $r->referrer ? ['id' => $r->referrer->id, 'name' => $r->referrer->name, 'email' => $r->referrer->email] : null,
                'referred_email'  => $r->referred_email,
                'referred'        => $r->referred ? ['id' => $r->referred->id, 'name' => $r->referred->name] : null,
                'reward_referrer' => $r->reward_referrer_cents,
                'reward_referred' => $r->reward_referred_cents,
                'expires_at'      => $r->expires_at?->toIso8601String(),
                'created_at'      => $r->created_at?->toIso8601String(),
            ]),
        ]);
    }

    /**
     * POST /api/admin/referrals
     * Emite un código manualmente para un cliente concreto.
     */
    public function store(Request $request): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();

        $data = $request->validate([
            'referrer_user_id' => ['required', 'integer', 'exists:users,id'],
            'referred_email'   => ['nullable', 'email', 'max:255'],
            'expires_in_days'  => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);

        $referrer = User::query()->withoutGlobalScopes()
            ->where('id', $data['referrer_user_id'])
            ->where('tenant_id', $tenant->id)
            ->where('role', User::ROLE_CLIENT)
            ->firstOrFail();

        $referral = $this->issue->execute(
            $referrer,
            $data['referred_email'] ?? null,
            $data['expires_in_days'] ?? 60,
        );

        return response()->json([
            'code'       => $referral->code,
            'expires_at' => $referral->expires_at?->toIso8601String(),
            'share_url'  => sprintf(
                '%s/b/%s?ref=%s',
                rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/'),
                $tenant->slug,
                $referral->code,
            ),
        ], 201);
    }

    private function guardWrite(Request $request): void
    {
        $u = $request->user();
        if (! $u || ! $u->canWrite()) {
            abort(response()->json(['error' => 'role_forbidden'], 403));
        }
    }
}

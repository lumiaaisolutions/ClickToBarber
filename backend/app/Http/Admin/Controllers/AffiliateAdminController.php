<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Affiliates\Models\Affiliate;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Sólo el platform_owner puede gestionar affiliates (es B2B-LUMIA, no
 * por tenant).
 */
final class AffiliateAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->guardOwner($request);

        $affiliates = Affiliate::query()->orderByDesc('id')->limit(200)->get();
        $referrals = DB::table('affiliate_referrals')
            ->select('affiliate_id', DB::raw('COUNT(*) as cnt'), DB::raw('SUM(total_commission_paid_cents) as total'))
            ->groupBy('affiliate_id')->get()->keyBy('affiliate_id');

        return response()->json($affiliates->map(fn (Affiliate $a) => [
            'id'                  => $a->id,
            'name'                => $a->name,
            'email'               => $a->email,
            'code'                => $a->code,
            'commission_pct'      => $a->commission_pct,
            'is_active'           => $a->is_active,
            'tenants_referred'    => (int) ($referrals[$a->id]->cnt ?? 0),
            'commission_paid_cents' => (int) ($referrals[$a->id]->total ?? 0),
        ]));
    }

    public function store(Request $request): JsonResponse
    {
        $this->guardOwner($request);
        $data = $request->validate([
            'name'           => ['required', 'string', 'max:120'],
            'email'          => ['required', 'email', 'unique:affiliates,email'],
            'commission_pct' => ['nullable', 'integer', 'min:5', 'max:50'],
        ]);

        $a = Affiliate::create([
            ...$data,
            'code'           => Affiliate::newCode(),
            'commission_pct' => $data['commission_pct'] ?? 30,
            'is_active'      => true,
        ]);

        return response()->json($a, 201);
    }

    private function guardOwner(Request $request): void
    {
        $u = $request->user();
        if (! $u || ! $u->isPlatformOwner()) abort(response()->json(['error' => 'platform_owner_only'], 403));
    }
}

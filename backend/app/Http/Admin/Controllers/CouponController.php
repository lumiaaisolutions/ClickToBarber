<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Marketing\Models\Coupon;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * CRUD básico de cupones del tenant.
 *
 *  GET    /api/admin/coupons
 *  POST   /api/admin/coupons        { discount_pct? | discount_cents?, expires_at?, code? }
 *  POST   /api/admin/coupons/bulk   { count, discount_pct? | discount_cents?, expires_at? }
 *  DELETE /api/admin/coupons/{id}
 */
final class CouponController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function index(): JsonResponse
    {
        $tenant = $this->current->require();
        $coupons = Coupon::query()
            ->where('tenant_id', $tenant->id)
            ->orderByDesc('id')
            ->limit(200)
            ->get();

        return response()->json($coupons->map(fn (Coupon $c) => $this->serialize($c)));
    }

    public function store(Request $request): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();

        $data = $request->validate([
            'discount_pct'   => ['nullable', 'integer', 'min:1', 'max:100', 'required_without:discount_cents'],
            'discount_cents' => ['nullable', 'integer', 'min:1',           'required_without:discount_pct'],
            'expires_at'     => ['nullable', 'date'],
            'code'           => ['nullable', 'string', 'max:24', 'unique:coupons,code'],
        ]);

        $coupon = Coupon::create([
            'tenant_id'      => $tenant->id,
            'code'           => $data['code'] ?? $this->generateCode($tenant->slug),
            'discount_pct'   => $data['discount_pct'] ?? null,
            'discount_cents' => $data['discount_cents'] ?? null,
            'expires_at'     => $data['expires_at'] ?? null,
        ]);

        return response()->json($this->serialize($coupon), 201);
    }

    public function bulk(Request $request): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();

        $data = $request->validate([
            'count'          => ['required', 'integer', 'min:1', 'max:500'],
            'discount_pct'   => ['nullable', 'integer', 'min:1', 'max:100', 'required_without:discount_cents'],
            'discount_cents' => ['nullable', 'integer', 'min:1',            'required_without:discount_pct'],
            'expires_at'     => ['nullable', 'date'],
        ]);

        $created = [];
        for ($i = 0; $i < $data['count']; $i++) {
            $created[] = Coupon::create([
                'tenant_id'      => $tenant->id,
                'code'           => $this->generateCode($tenant->slug),
                'discount_pct'   => $data['discount_pct'] ?? null,
                'discount_cents' => $data['discount_cents'] ?? null,
                'expires_at'     => $data['expires_at'] ?? null,
            ]);
        }

        return response()->json([
            'created' => count($created),
            'codes'   => array_map(fn ($c) => $c->code, $created),
        ], 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();

        $coupon = Coupon::query()
            ->where('tenant_id', $tenant->id)
            ->where('id', $id)
            ->firstOrFail();
        $coupon->delete();

        return response()->json(['ok' => true]);
    }

    private function generateCode(string $tenantSlug): string
    {
        $prefix = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $tenantSlug) ?: 'LUM', 0, 4));
        return $prefix . strtoupper(Str::random(6));
    }

    private function serialize(Coupon $c): array
    {
        return [
            'id'             => $c->id,
            'code'           => $c->code,
            'discount_pct'   => $c->discount_pct,
            'discount_cents' => $c->discount_cents,
            'expires_at'     => $c->expires_at?->toIso8601String(),
            'redeemed_at'    => $c->redeemed_at?->toIso8601String(),
        ];
    }

    private function guardWrite(Request $request): void
    {
        $u = $request->user();
        if (! $u || ! $u->canWrite()) {
            abort(response()->json(['error' => 'role_forbidden'], 403));
        }
    }
}

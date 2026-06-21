<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Memberships\Models\ClientMembership;
use App\Domain\Memberships\Models\Membership;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class MembershipController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function index(): JsonResponse
    {
        $tenant = $this->current->require();
        $plans = Membership::query()->where('tenant_id', $tenant->id)->orderBy('price_cents')->get();

        $active = ClientMembership::query()
            ->where('tenant_id', $tenant->id)
            ->where('status', 'active')
            ->count();

        return response()->json([
            'plans'  => $plans,
            'kpis'   => ['active_subscribers' => $active],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();

        $data = $request->validate([
            'name'                          => ['required', 'string', 'max:120'],
            'price_cents'                   => ['required', 'integer', 'min:0'],
            'currency'                      => ['nullable', 'string', 'size:3'],
            'included_services_per_month'   => ['required', 'integer', 'min:1', 'max:60'],
            'eligible_service_ids'          => ['nullable', 'array'],
            'is_active'                     => ['nullable', 'boolean'],
        ]);

        $m = Membership::create([
            'tenant_id'                   => $tenant->id,
            'name'                        => $data['name'],
            'price_cents'                 => $data['price_cents'],
            'currency'                    => $data['currency'] ?? 'MXN',
            'included_services_per_month' => $data['included_services_per_month'],
            'eligible_service_ids'        => $data['eligible_service_ids'] ?? null,
            'is_active'                   => $data['is_active'] ?? true,
        ]);

        return response()->json($m, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();
        $m = Membership::query()->where('tenant_id', $tenant->id)->findOrFail($id);

        $data = $request->validate([
            'name'                          => ['nullable', 'string', 'max:120'],
            'price_cents'                   => ['nullable', 'integer', 'min:0'],
            'included_services_per_month'   => ['nullable', 'integer', 'min:1', 'max:60'],
            'eligible_service_ids'          => ['nullable', 'array'],
            'is_active'                     => ['nullable', 'boolean'],
        ]);

        $m->fill(array_filter($data, fn ($v) => $v !== null))->save();
        return response()->json($m);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();
        Membership::query()->where('tenant_id', $tenant->id)->where('id', $id)->delete();
        return response()->json(['ok' => true]);
    }

    private function guardWrite(Request $request): void
    {
        $u = $request->user();
        if (! $u || ! $u->canWrite()) abort(response()->json(['error' => 'role_forbidden'], 403));
    }
}

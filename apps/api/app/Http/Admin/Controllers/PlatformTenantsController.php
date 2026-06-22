<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Identity\Models\User;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class PlatformTenantsController extends Controller
{
    /** GET /api/admin/superadmin/tenants */
    public function index(Request $request): JsonResponse
    {
        $query = Tenant::query()->with('plan')->withCount('barbers');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('owner_email', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('plan_status', $status);
        }

        $tenants = $query->orderByDesc('created_at')->paginate(20);

        return response()->json([
            'data' => $tenants->getCollection()->map(fn (Tenant $t) => $this->tenantSummary($t)),
            'meta' => [
                'current_page' => $tenants->currentPage(),
                'last_page'    => $tenants->lastPage(),
                'total'        => $tenants->total(),
            ],
        ]);
    }

    /** GET /api/admin/superadmin/tenants/{id} */
    public function show(string $id): JsonResponse
    {
        $tenant = Tenant::with(['plan', 'barbers'])->withCount('barbers')->findOrFail($id);
        $users  = User::where('tenant_id', $tenant->id)->get(['id', 'name', 'email', 'role', 'created_at']);
        $plans  = Plan::where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name', 'price_cents']);

        return response()->json([
            'tenant'       => $this->tenantDetail($tenant),
            'users'        => $users,
            'available_plans' => $plans,
        ]);
    }

    /** PATCH /api/admin/superadmin/tenants/{id} */
    public function update(Request $request, string $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($id);

        $validated = $request->validate([
            'plan_id'        => ['sometimes', 'nullable', Rule::exists('plans', 'id')],
            'plan_status'    => ['sometimes', 'nullable', Rule::in(['active', 'trialing', 'incomplete', 'past_due', 'canceled'])],
            'pago_externo'   => ['sometimes', 'nullable', 'boolean'],
            'trial_ends_at'  => ['sometimes', 'nullable', 'date'],
        ]);

        $tenant->forceFill(array_filter($validated, fn ($v) => $v !== null || array_key_exists('pago_externo', $validated)))->save();

        // Allow explicitly setting pago_externo to false
        if ($request->has('pago_externo')) {
            $tenant->forceFill(['pago_externo' => $request->boolean('pago_externo')])->save();
        }

        return response()->json(['tenant' => $this->tenantDetail($tenant->fresh(['plan']))]);
    }

    /** GET /api/admin/superadmin/stats */
    public function stats(): JsonResponse
    {
        $total    = Tenant::count();
        $trialing = Tenant::where('plan_status', 'trialing')
                          ->where('trial_ends_at', '>', now())->count();
        $active   = Tenant::where(function ($q) {
                        $q->where('plan_status', 'active')
                          ->orWhere('pago_externo', true);
                    })->count();
        $inactive = Tenant::where('plan_status', 'incomplete')->count();
        $recent   = Tenant::with('plan')
                          ->orderByDesc('created_at')
                          ->limit(10)
                          ->get()
                          ->map(fn (Tenant $t) => $this->tenantSummary($t));

        return response()->json([
            'total'    => $total,
            'trialing' => $trialing,
            'active'   => $active,
            'inactive' => $inactive,
            'recent'   => $recent,
        ]);
    }

    private function tenantSummary(Tenant $t): array
    {
        $trialDaysLeft = null;
        if ($t->plan_status === 'trialing' && $t->trial_ends_at) {
            $diff = $t->trial_ends_at->diffInDays(now(), false);
            $trialDaysLeft = max(0, -$diff);
        }

        return [
            'id'             => $t->id,
            'name'           => $t->name,
            'slug'           => $t->slug,
            'owner_email'    => $t->owner_email,
            'plan_code'      => $t->plan?->code,
            'plan_name'      => $t->plan?->name,
            'plan_status'    => $t->plan_status,
            'pago_externo'   => $t->pago_externo,
            'trial_ends_at'  => $t->trial_ends_at?->toIso8601String(),
            'trial_days_left'=> $trialDaysLeft,
            'barbers_count'  => $t->barbers_count ?? null,
            'created_at'     => $t->created_at->toIso8601String(),
        ];
    }

    private function tenantDetail(Tenant $t): array
    {
        return array_merge($this->tenantSummary($t), [
            'plan_id'    => $t->plan_id,
            'timezone'   => $t->timezone,
            'phone'      => $t->phone,
            'address'    => $t->address,
            'updated_at' => $t->updated_at->toIso8601String(),
        ]);
    }
}

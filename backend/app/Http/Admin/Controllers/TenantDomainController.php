<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Tenancy\CurrentTenant;
use App\Domain\Tenancy\Models\TenantDomain;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * GET    /api/admin/domains             — lista
 * POST   /api/admin/domains             — crea (queda pending hasta verificar TXT)
 * POST   /api/admin/domains/{id}/verify — verifica el TXT DNS
 * POST   /api/admin/domains/{id}/primary — marca como primario
 * DELETE /api/admin/domains/{id}        — quita
 */
final class TenantDomainController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function index(): JsonResponse
    {
        $tenant = $this->current->require();
        $domains = TenantDomain::query()
            ->where('tenant_id', $tenant->id)
            ->orderByDesc('is_primary')
            ->orderBy('host')
            ->get();

        return response()->json($domains->map(fn (TenantDomain $d) => [
            'id'          => $d->id,
            'host'        => $d->host,
            'verification' => [
                'record_name'  => '_lumia-verify',
                'record_type'  => 'TXT',
                'record_value' => $d->verification_token,
            ],
            'verified_at' => $d->verified_at?->toIso8601String(),
            'is_primary'  => $d->is_primary,
            'created_at'  => $d->created_at?->toIso8601String(),
        ]));
    }

    public function store(Request $request): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();

        $data = $request->validate([
            'host' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9.-]+$/'],
        ]);

        $host = strtolower(trim($data['host'], '/'));

        if (TenantDomain::query()->where('host', $host)->exists()) {
            return response()->json(['error' => 'host_taken'], 409);
        }

        $domain = TenantDomain::create([
            'tenant_id'          => $tenant->id,
            'host'               => $host,
            'verification_token' => TenantDomain::newVerificationToken(),
            'is_primary'         => false,
        ]);

        return response()->json([
            'id'   => $domain->id,
            'host' => $domain->host,
            'verification' => [
                'record_name'  => '_lumia-verify',
                'record_type'  => 'TXT',
                'record_value' => $domain->verification_token,
            ],
        ], 201);
    }

    public function verify(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();

        $domain = TenantDomain::query()
            ->where('tenant_id', $tenant->id)
            ->where('id', $id)
            ->firstOrFail();

        $records = @dns_get_record('_lumia-verify.' . $domain->host, DNS_TXT) ?: [];
        $found = collect($records)
            ->pluck('txt')
            ->contains($domain->verification_token);

        if (! $found) {
            return response()->json([
                'error' => 'txt_not_found',
                'expected' => $domain->verification_token,
            ], 422);
        }

        $domain->forceFill(['verified_at' => now()])->save();
        Cache::forget('host_to_tenant:' . $domain->host);

        return response()->json(['ok' => true, 'verified_at' => $domain->verified_at?->toIso8601String()]);
    }

    public function makePrimary(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();

        $domain = TenantDomain::query()
            ->where('tenant_id', $tenant->id)
            ->where('id', $id)
            ->firstOrFail();

        if (! $domain->verified_at) {
            return response()->json(['error' => 'not_verified'], 422);
        }

        \DB::transaction(function () use ($domain, $tenant) {
            TenantDomain::query()
                ->where('tenant_id', $tenant->id)
                ->update(['is_primary' => false]);
            $domain->forceFill(['is_primary' => true])->save();
        });

        return response()->json(['ok' => true]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();

        $domain = TenantDomain::query()
            ->where('tenant_id', $tenant->id)
            ->where('id', $id)
            ->firstOrFail();

        Cache::forget('host_to_tenant:' . $domain->host);
        $domain->delete();

        return response()->json(['ok' => true]);
    }

    private function guardWrite(Request $request): void
    {
        $u = $request->user();
        if (! $u || ! $u->canWrite()) {
            abort(response()->json(['error' => 'role_forbidden'], 403));
        }
    }
}

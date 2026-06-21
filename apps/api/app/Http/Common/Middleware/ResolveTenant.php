<?php

declare(strict_types=1);

namespace App\Http\Common\Middleware;

use App\Domain\Tenancy\CurrentTenant;
use App\Domain\Tenancy\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resuelve el tenant para la request actual desde, en orden:
 *   1) Token Sanctum (Authorization: Bearer ...) — fuente autoritativa
 *      para /api/admin/* y demás endpoints autenticados.
 *   2) Parámetro de ruta {slug} — usado por /api/client/tenants/{slug}.
 *   3) Header X-Tenant (UUID o slug) — sólo permitido fuera de producción
 *      para tooling local; ignorado en producción.
 *
 * En PostgreSQL emite SET LOCAL app.current_tenant para activar las
 * políticas Row Level Security definidas a nivel de motor.
 */
final class ResolveTenant
{
    public function __construct(private CurrentTenant $current) {}

    public function handle(Request $request, Closure $next): Response
    {
        $tenant = $this->resolveFromRequest($request);

        if ($tenant) {
            $this->current->set($tenant);

            try {
                $conn = DB::connection();
                if ($conn->getDriverName() === 'pgsql') {
                    $conn->statement('SET LOCAL app.current_tenant = ?', [$tenant->id]);
                }
            } catch (\Throwable) {
                // Sin conexión a BD; queries posteriores fallarán con error claro.
            }
        }

        return $next($request);
    }

    private function resolveFromRequest(Request $request): ?Tenant
    {
        if ($bearer = $request->bearerToken()) {
            $accessToken = PersonalAccessToken::findToken($bearer);
            $tokenable   = $accessToken?->tokenable;
            if ($tokenable && property_exists($tokenable, 'tenant_id') === false) {
                $tenantId = $tokenable->getAttribute('tenant_id');
            } else {
                $tenantId = $tokenable?->tenant_id;
            }
            if ($tenantId) {
                $tenant = Tenant::query()->withoutGlobalScopes()->find($tenantId);
                if ($tenant) {
                    return $tenant;
                }
            }
        }

        if ($slug = $request->route('slug')) {
            $tenant = Tenant::query()->withoutGlobalScopes()->where('slug', $slug)->first();
            if ($tenant) {
                return $tenant;
            }
        }

        if (! app()->isProduction() && ($header = $request->header('X-Tenant'))) {
            $tenant = Tenant::query()
                ->withoutGlobalScopes()
                ->where('id', $header)
                ->orWhere('slug', $header)
                ->first();
            if ($tenant) {
                return $tenant;
            }
        }

        return null;
    }
}

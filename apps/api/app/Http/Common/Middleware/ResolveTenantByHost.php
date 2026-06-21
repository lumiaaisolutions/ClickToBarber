<?php

declare(strict_types=1);

namespace App\Http\Common\Middleware;

use App\Domain\Tenancy\CurrentTenant;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\Models\TenantDomain;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resuelve el tenant a partir del Host: cuando una barbería usa custom
 * domain (reservas.barberia.com → app de LUMIA), este middleware mapea el
 * Host → tenant y lo inyecta antes de cualquier controller.
 *
 * Funciona en COMPLEMENTO con `ResolveTenant` (que se basa en bearer
 * token, slug o header X-Tenant). El de host se ejecuta SOLO si el host
 * no es el dominio canónico de LUMIA.
 *
 * El resultado se cachea 60s para no martillar la DB en cada request.
 */
final class ResolveTenantByHost
{
    public function __construct(private CurrentTenant $current) {}

    public function handle(Request $request, Closure $next): Response
    {
        // Skip si ya hay tenant resuelto (Bearer/slug/header lo hicieron antes).
        if ($this->current->isSet()) {
            return $next($request);
        }

        $host = strtolower((string) $request->getHost());
        if ($this->isCanonicalHost($host)) {
            return $next($request);
        }

        $tenantId = Cache::remember(
            'host_to_tenant:' . $host,
            now()->addMinute(),
            function () use ($host) {
                return TenantDomain::query()
                    ->withoutGlobalScopes()
                    ->where('host', $host)
                    ->whereNotNull('verified_at')
                    ->value('tenant_id');
            },
        );

        if ($tenantId) {
            $tenant = Tenant::query()->withoutGlobalScopes()->find($tenantId);
            if ($tenant) {
                $this->current->set($tenant);
                try {
                    if (DB::connection()->getDriverName() === 'pgsql') {
                        DB::statement('SET LOCAL app.current_tenant = ?', [$tenant->id]);
                    }
                } catch (\Throwable) {
                    // sin conexión: queries fallarán claro.
                }
            }
        }

        return $next($request);
    }

    private function isCanonicalHost(string $host): bool
    {
        $canonical = [
            'localhost', '127.0.0.1', '::1',
            parse_url((string) env('APP_URL', ''), PHP_URL_HOST) ?: '',
            parse_url((string) env('FRONTEND_URL', ''), PHP_URL_HOST) ?: '',
        ];

        return in_array($host, array_filter($canonical), true);
    }
}

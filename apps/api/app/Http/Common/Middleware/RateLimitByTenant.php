<?php

declare(strict_types=1);

namespace App\Http\Common\Middleware;

use App\Domain\Tenancy\CurrentTenant;
use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rate limit por tenant — complemento al RateLimitByIp.
 *
 * Default: 600 req/min por tenant. Configurable con
 * `RATE_LIMIT_TENANT_PER_MIN`. Sólo aplica si hay tenant resuelto;
 * si no, deja pasar (RateLimitByIp se encarga).
 */
final class RateLimitByTenant
{
    public function __construct(
        private RateLimiter $limiter,
        private CurrentTenant $current,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->current->isSet()) {
            return $next($request);
        }

        $perMin = (int) env('RATE_LIMIT_TENANT_PER_MIN', 600);
        $key = 'rl:tenant:' . $this->current->id();

        if ($this->limiter->tooManyAttempts($key, $perMin)) {
            return response()->json([
                'error'   => 'tenant_rate_limited',
                'message' => 'Demasiadas peticiones para este tenant. Intenta en un minuto.',
            ], 429)->header('Retry-After', (string) $this->limiter->availableIn($key));
        }

        $this->limiter->hit($key, 60);
        $response = $next($request);
        $remaining = max(0, $perMin - $this->limiter->attempts($key));
        $response->headers->set('X-Tenant-RateLimit-Remaining', (string) $remaining);

        return $response;
    }
}

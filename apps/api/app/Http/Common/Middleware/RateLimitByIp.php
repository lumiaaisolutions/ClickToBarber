<?php

declare(strict_types=1);

namespace App\Http\Common\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rate limit global por IP usando el cache de Laravel (file/redis según .env).
 * Lee el límite de RATE_LIMIT_GLOBAL_PER_MIN (default 100/min).
 */
final class RateLimitByIp
{
    public function __construct(private RateLimiter $limiter) {}

    public function handle(Request $request, Closure $next): Response
    {
        $perMin = (int) env('RATE_LIMIT_GLOBAL_PER_MIN', 100);
        $key = 'rl:ip:' . sha1($request->ip());

        if ($this->limiter->tooManyAttempts($key, $perMin)) {
            return response()->json([
                'error'   => 'rate_limited',
                'message' => 'Demasiadas peticiones. Intenta de nuevo en un minuto.',
            ], 429)->header('Retry-After', (string) $this->limiter->availableIn($key));
        }

        $this->limiter->hit($key, 60);

        $response = $next($request);
        $remaining = max(0, $perMin - $this->limiter->attempts($key));
        $response->headers->set('X-RateLimit-Limit', (string) $perMin);
        $response->headers->set('X-RateLimit-Remaining', (string) $remaining);

        return $response;
    }
}

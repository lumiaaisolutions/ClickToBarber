<?php

declare(strict_types=1);

namespace App\Http\Common\Middleware;

use App\Domain\Tenancy\CurrentTenant;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Inyecta contexto a logs y headers para correlación de requests.
 *
 *  - Genera o respeta `X-Request-Id` y lo agrega a la respuesta.
 *  - Empuja `request_id`, `tenant_id`, `user_id` al contexto global de Log.
 *
 * Esto permite que cualquier `Log::info(...)` posterior llegue a los
 * agregadores de logs (Loki, Datadog) con campos estructurados sin que
 * cada call site tenga que pasarlos explícitamente.
 */
final class RequestContext
{
    public function __construct(private CurrentTenant $current) {}

    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $request->header('X-Request-Id') ?: (string) Str::uuid();
        $request->attributes->set('request_id', $requestId);

        Log::shareContext([
            'request_id' => $requestId,
            'tenant_id'  => $this->current->id(),
            'user_id'    => optional($request->user())->id,
            'ip'         => $request->ip(),
            'route'      => $request->path(),
        ]);

        $response = $next($request);
        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Common\Middleware;

use App\Domain\Platform\Models\ApiKey;
use App\Domain\Tenancy\CurrentTenant;
use App\Domain\Tenancy\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autentica con API key (header `Authorization: Bearer lk_xxx`).
 * Establece tenant en CurrentTenant y verifica scope (parámetro middleware).
 *
 *   Route::get(...)->middleware('apikey:appointments:read');
 */
final class AuthenticateApiKey
{
    public function __construct(private CurrentTenant $current) {}

    public function handle(Request $request, Closure $next, string $requiredScope = ''): Response
    {
        $token = $request->bearerToken();
        if (! $token || ! str_starts_with($token, 'lk_')) {
            return response()->json(['error' => 'invalid_api_key'], 401);
        }

        $hash = hash('sha256', $token);
        $key = ApiKey::query()->withoutGlobalScopes()->where('hash', $hash)->first();

        if (! $key || ! $key->isUsable()) {
            return response()->json(['error' => 'invalid_api_key'], 401);
        }

        if ($requiredScope !== '' && ! in_array($requiredScope, $key->scopes ?? [], true)
            && ! in_array('*', $key->scopes ?? [], true)
        ) {
            return response()->json(['error' => 'insufficient_scope', 'required' => $requiredScope], 403);
        }

        $tenant = Tenant::query()->withoutGlobalScopes()->find($key->tenant_id);
        if (! $tenant) {
            return response()->json(['error' => 'tenant_not_found'], 404);
        }

        $this->current->set($tenant);
        $key->forceFill(['last_used_at' => now()])->saveQuietly();
        $request->attributes->set('api_key_id', $key->id);

        return $next($request);
    }
}

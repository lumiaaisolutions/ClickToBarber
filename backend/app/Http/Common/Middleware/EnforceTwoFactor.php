<?php

declare(strict_types=1);

namespace App\Http\Common\Middleware;

use App\Domain\Tenancy\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Si el tenant del usuario tiene `security.require_2fa = true`, exige
 * que `two_factor_confirmed_at` esté seteado. Si no, devuelve 403 con
 * `{ error: 'twofa_required_by_tenant' }` para que el frontend redirija
 * a `/admin/security/2fa`.
 *
 * Excepciones (no aplica este middleware):
 *  - rutas de auth (login/logout/2fa verify)
 *  - rutas de configuración del 2FA mismo (`/admin/security/2fa/*`)
 */
final class EnforceTwoFactor
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return $next($request);
        }
        if ($user->two_factor_confirmed_at) {
            return $next($request);
        }
        if (! $user->tenant_id) {
            return $next($request);
        }

        $tenant = Tenant::query()->withoutGlobalScopes()->find($user->tenant_id);
        $required = (bool) (($tenant?->security ?? [])['require_2fa'] ?? false);
        if (! $required) {
            return $next($request);
        }

        // Rutas exentas (configuración del propio 2FA)
        $path = $request->path();
        $exempt = [
            'api/admin/security/2fa',
            'api/admin/security/2fa/setup',
            'api/admin/security/2fa/confirm',
            'api/auth/me',
            'api/auth/logout',
        ];
        if (in_array($path, $exempt, true)) {
            return $next($request);
        }

        return response()->json([
            'error'    => 'twofa_required_by_tenant',
            'redirect' => '/admin/security/2fa',
            'message'  => 'Tu organización requiere verificación en dos pasos antes de continuar.',
        ], 403);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Common\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Permite acceso al endpoint sólo si el usuario autenticado tiene alguno
 * de los roles indicados. Uso: ->middleware('role:admin,manager').
 *
 * platform_owner siempre puede acceder (super-admin de LUMIA).
 */
final class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['error' => 'unauthenticated'], 401);
        }

        // platform_owner es bypass — staff LUMIA con acceso a todo.
        if ($user->role === 'platform_owner') {
            return $next($request);
        }

        if (! in_array($user->role, $roles, true)) {
            return response()->json([
                'error'         => 'role_forbidden',
                'role'          => $user->role,
                'required_any'  => $roles,
                'message'       => 'Tu rol no permite esta acción.',
            ], 403);
        }

        return $next($request);
    }
}

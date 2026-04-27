<?php

declare(strict_types=1);

namespace App\Http\Common\Controllers;

use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Autenticación basada en Sanctum personal access tokens.
 *
 * El portal admin obtiene un token con POST /api/auth/login y lo envía
 * en cabecera Authorization: Bearer <token> para acceder a /api/admin/*.
 * El tenant se deriva automáticamente de $user->tenant_id, eliminando
 * el header X-Tenant inseguro del modo demo anterior.
 */
final class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = User::query()
            ->withoutGlobalScopes()
            ->where('email', $data['email'])
            ->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciales inválidas.'],
            ]);
        }

        if (! in_array($user->role, [User::ROLE_ADMIN, User::ROLE_PLATFORM_OWNER, User::ROLE_BARBER], true)) {
            throw ValidationException::withMessages([
                'email' => ['Esta cuenta no tiene acceso al portal admin.'],
            ]);
        }

        $tenant = $user->tenant_id ? Tenant::query()->withoutGlobalScopes()->find($user->tenant_id) : null;

        $token = $user->createToken(
            name: 'admin-portal',
            abilities: ['admin:*'],
        )->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
            'tenant' => $tenant ? [
                'id'   => $tenant->id,
                'slug' => $tenant->slug,
                'name' => $tenant->name,
                'plan' => $tenant->plan_id,
            ] : null,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();
        $token?->delete();

        return response()->json(['ok' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenant = $user->tenant_id
            ? Tenant::query()->withoutGlobalScopes()->find($user->tenant_id)
            : null;

        return response()->json([
            'user' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
            'tenant' => $tenant ? [
                'id'   => $tenant->id,
                'slug' => $tenant->slug,
                'name' => $tenant->name,
                'plan' => $tenant->plan_id,
            ] : null,
        ]);
    }
}

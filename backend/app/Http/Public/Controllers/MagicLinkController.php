<?php

declare(strict_types=1);

namespace App\Http\Public\Controllers;

use App\Domain\Billing\Models\MagicLink;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Consume un magic link de onboarding (single-use, 24h TTL).
 *
 * Flujo:
 *   1. Frontend recibe ?token=xxx en /auth/magic.
 *   2. Llama POST /api/public/magic/consume.
 *   3. Si válido → devuelve token Sanctum + datos del user/tenant.
 *   4. Frontend setea cookie httpOnly y redirige a /admin/onboarding.
 */
final class MagicLinkController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'min:32'],
        ]);

        $link = MagicLink::findValidByToken($data['token'], MagicLink::PURPOSE_ONBOARDING);
        if (! $link) {
            return response()->json([
                'error' => 'invalid_or_expired_link',
            ], 410);
        }

        $user = User::query()->withoutGlobalScopes()->findOrFail($link->user_id);
        $tenant = $user->tenant_id
            ? Tenant::query()->withoutGlobalScopes()->find($user->tenant_id)
            : null;

        $link->markUsed($request->ip());

        // Token Sanctum corto-vivo (1 hora) para terminar el onboarding
        $token = $user->createToken(
            name: 'onboarding-magic',
            abilities: ['admin:*'],
            expiresAt: now()->addHour(),
        )->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'             => $user->id,
                'name'           => $user->name,
                'email'          => $user->email,
                'role'           => $user->role,
                'first_login_at' => $user->first_login_at?->toIso8601String(),
                'can_write'      => $user->canWrite(),
                'can_see_finance' => $user->canSeeFinance(),
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

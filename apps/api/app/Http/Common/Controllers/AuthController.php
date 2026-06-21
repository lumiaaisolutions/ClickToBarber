<?php

declare(strict_types=1);

namespace App\Http\Common\Controllers;

use App\Domain\Audit\AuditLogger;
use App\Domain\Audit\Models\AuditLog;
use App\Domain\Identity\Models\User;
use App\Domain\Identity\Models\UserLoginEvent;
use App\Domain\Identity\Services\LoginAlertService;
use App\Domain\Identity\Services\TotpService;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Autenticación basada en Sanctum personal access tokens con flujo opcional de 2FA.
 *
 * Flujo:
 *   1. POST /auth/login con email+password.
 *      - Si el user tiene 2FA confirmado: devuelve `requires_2fa: true` + `login_token` (5 min TTL).
 *        El navegador no recibe Sanctum token todavía.
 *      - Si NO tiene 2FA: emite Sanctum token directamente.
 *   2. POST /auth/2fa/verify con `login_token` + `code` (TOTP o recovery code).
 *      - Si válido: emite Sanctum token y consume el `login_token`.
 *
 * Eventos registrados (user_login_events + audit_logs):
 *   login.failed, login.success, twofa_required, twofa_failed, 2fa.enabled, 2fa.disabled
 */
final class AuthController extends Controller
{
    public function __construct(
        private TotpService $totp,
        private LoginAlertService $loginAlerts,
    ) {}

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
            if ($user) {
                $this->loginAlerts->recordFailure($user, $request, UserLoginEvent::RESULT_FAILED);
                AuditLogger::record(
                    action: AuditLog::ACTION_LOGIN_FAILED,
                    subjectType: User::class,
                    subjectId: $user->id,
                    actorUserId: $user->id,
                    actorEmail: $user->email,
                );
            }
            throw ValidationException::withMessages([
                'email' => ['Credenciales inválidas.'],
            ]);
        }

        if (! in_array($user->role, User::PORTAL_ROLES, true)) {
            throw ValidationException::withMessages([
                'email' => ['Esta cuenta no tiene acceso al portal admin.'],
            ]);
        }

        // 2FA habilitado: devuelve token interim, no el Sanctum.
        if ($user->two_factor_confirmed_at) {
            $loginToken = Str::random(48);
            Cache::put('login_token:' . hash('sha256', $loginToken), $user->id, 300); // 5 min

            $this->loginAlerts->recordFailure($user, $request, UserLoginEvent::RESULT_TWOFA_REQUIRED);

            return response()->json([
                'requires_2fa' => true,
                'login_token'  => $loginToken,
                'email'        => $user->email,
            ]);
        }

        return $this->issueSanctumToken($user, $request);
    }

    public function verify2fa(Request $request): JsonResponse
    {
        $data = $request->validate([
            'login_token' => ['required', 'string', 'min:32'],
            'code'        => ['required', 'string', 'min:6', 'max:9'],
        ]);

        $cacheKey = 'login_token:' . hash('sha256', $data['login_token']);
        $userId = Cache::get($cacheKey);
        if (! $userId) {
            return response()->json(['error' => 'login_token_invalid'], 410);
        }

        $user = User::query()->withoutGlobalScopes()->find($userId);
        if (! $user || ! $user->two_factor_secret) {
            Cache::forget($cacheKey);
            return response()->json(['error' => 'twofa_not_set_up'], 422);
        }

        $secret = Crypt::decryptString($user->two_factor_secret);
        $code = preg_replace('/\s+/', '', $data['code']) ?? '';

        // Acepta TOTP (6 dígitos) o recovery code (formato xxxx-xxxx).
        $valid = false;
        if (ctype_digit($code) && strlen($code) === 6 && $this->totp->verify($secret, $code)) {
            $valid = true;
        } elseif (preg_match('/^[a-f0-9]{4}-[a-f0-9]{4}$/i', $code)) {
            $codes = json_decode(Crypt::decryptString($user->two_factor_recovery_codes ?? '[]'), true) ?: [];
            $idx = array_search(strtolower($code), array_map('strtolower', $codes), true);
            if ($idx !== false) {
                $valid = true;
                array_splice($codes, $idx, 1);
                $user->forceFill([
                    'two_factor_recovery_codes' => Crypt::encryptString(json_encode($codes)),
                ])->save();
            }
        }

        if (! $valid) {
            $this->loginAlerts->recordFailure($user, $request, UserLoginEvent::RESULT_TWOFA_FAILED);
            return response()->json(['error' => 'invalid_code'], 422);
        }

        Cache::forget($cacheKey);

        return $this->issueSanctumToken($user, $request);
    }

    private function issueSanctumToken(User $user, Request $request): JsonResponse
    {
        $tenant = $user->tenant_id
            ? Tenant::query()->withoutGlobalScopes()->find($user->tenant_id)
            : null;

        $token = $user->createToken(
            name: 'admin-portal',
            abilities: ['admin:*'],
        )->plainTextToken;

        $this->loginAlerts->recordSuccessAndMaybeAlert($user, $request);
        AuditLogger::record(
            action: AuditLog::ACTION_LOGIN_SUCCESS,
            subjectType: User::class,
            subjectId: $user->id,
            actorUserId: $user->id,
            actorEmail: $user->email,
        );

        return response()->json([
            'token'  => $token,
            'user'   => $this->serializeUser($user),
            'tenant' => $this->serializeTenant($tenant),
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
            'user'   => $this->serializeUser($user),
            'tenant' => $this->serializeTenant($tenant),
        ]);
    }

    private function serializeUser(User $user): array
    {
        return [
            'id'              => $user->id,
            'name'            => $user->name,
            'email'           => $user->email,
            'role'            => $user->role,
            'first_login_at'  => $user->first_login_at?->toIso8601String(),
            'can_write'       => $user->canWrite(),
            'can_see_finance' => $user->canSeeFinance(),
            'two_factor'      => (bool) $user->two_factor_confirmed_at,
        ];
    }

    private function serializeTenant(?Tenant $tenant): ?array
    {
        if (! $tenant) {
            return null;
        }

        return [
            'id'   => $tenant->id,
            'slug' => $tenant->slug,
            'name' => $tenant->name,
            'plan' => $tenant->plan_id,
        ];
    }
}

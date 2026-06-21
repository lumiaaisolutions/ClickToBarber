<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Audit\AuditLogger;
use App\Domain\Audit\Models\AuditLog;
use App\Domain\Identity\Services\TotpService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;

/**
 * Endpoints para configurar 2FA TOTP del propio admin.
 *
 *  GET  /api/admin/security/2fa            → estado actual.
 *  POST /api/admin/security/2fa/setup      → genera secret + QR + recovery codes (sin confirmar todavía).
 *  POST /api/admin/security/2fa/confirm    → activa 2FA tras verificar el primer código.
 *  POST /api/admin/security/2fa/disable    → desactiva (requiere password actual).
 *  POST /api/admin/security/2fa/regenerate-codes → renueva códigos de recuperación.
 */
final class TwoFactorController extends Controller
{
    public function __construct(private TotpService $totp) {}

    public function status(Request $request): JsonResponse
    {
        $u = $request->user();

        return response()->json([
            'enabled'              => (bool) $u->two_factor_confirmed_at,
            'pending_confirmation' => $u->two_factor_secret && ! $u->two_factor_confirmed_at,
            'confirmed_at'         => $u->two_factor_confirmed_at?->toIso8601String(),
        ]);
    }

    public function setup(Request $request): JsonResponse
    {
        $u = $request->user();
        if ($u->two_factor_confirmed_at) {
            return response()->json(['error' => 'already_enabled'], 422);
        }

        $secret = $this->totp->generateSecret();
        $codes  = $this->totp->generateRecoveryCodes();

        $u->forceFill([
            'two_factor_secret'          => Crypt::encryptString($secret),
            'two_factor_recovery_codes'  => Crypt::encryptString(json_encode($codes)),
            'two_factor_confirmed_at'    => null,
        ])->save();

        return response()->json([
            'secret'        => $secret,
            'otpauth_uri'   => $this->totp->provisioningUri(
                $secret,
                $u->email,
                config('app.name', 'LUMIA'),
            ),
            'recovery_codes' => $codes,
        ]);
    }

    public function confirm(Request $request): JsonResponse
    {
        $u = $request->user();

        $data = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        if (! $u->two_factor_secret) {
            return response()->json(['error' => 'setup_first'], 422);
        }

        $secret = Crypt::decryptString($u->two_factor_secret);
        if (! $this->totp->verify($secret, $data['code'])) {
            return response()->json(['error' => 'invalid_code'], 422);
        }

        $u->forceFill(['two_factor_confirmed_at' => now()])->save();

        AuditLogger::record(
            action: AuditLog::ACTION_2FA_ENABLED,
            subjectType: $u::class,
            subjectId: $u->id,
            actorUserId: $u->id,
            actorEmail: $u->email,
        );

        return response()->json(['ok' => true]);
    }

    public function disable(Request $request): JsonResponse
    {
        $u = $request->user();

        $data = $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (! \Hash::check($data['password'], $u->password)) {
            return response()->json(['error' => 'invalid_password'], 422);
        }

        $u->forceFill([
            'two_factor_secret'         => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at'   => null,
        ])->save();

        AuditLogger::record(
            action: AuditLog::ACTION_2FA_DISABLED,
            subjectType: $u::class,
            subjectId: $u->id,
            actorUserId: $u->id,
            actorEmail: $u->email,
        );

        return response()->json(['ok' => true]);
    }

    public function regenerateCodes(Request $request): JsonResponse
    {
        $u = $request->user();
        if (! $u->two_factor_confirmed_at) {
            return response()->json(['error' => 'not_enabled'], 422);
        }

        $codes = $this->totp->generateRecoveryCodes();
        $u->forceFill([
            'two_factor_recovery_codes' => Crypt::encryptString(json_encode($codes)),
        ])->save();

        return response()->json(['recovery_codes' => $codes]);
    }
}

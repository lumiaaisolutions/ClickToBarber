<?php

declare(strict_types=1);

namespace App\Domain\Growth\Services;

use App\Domain\Growth\Models\Referral;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Models\Tenant;
use InvalidArgumentException;

/**
 * Emite un código de referido para un cliente referidor.
 *
 * Reglas:
 *  - Un cliente puede tener múltiples códigos pero sólo se permite uno
 *    "pending" por (referrer, referred_email).
 *  - Si no se pasa email, se emite un código abierto (link compartible).
 *  - Caducidad por defecto: 60 días.
 */
final class IssueReferral
{
    public function execute(User $referrer, ?string $referredEmail = null, int $expiresInDays = 60): Referral
    {
        if ($referrer->role !== User::ROLE_CLIENT) {
            throw new InvalidArgumentException('Sólo clientes finales pueden referir.');
        }

        $tenant = Tenant::query()->withoutGlobalScopes()->find($referrer->tenant_id);
        if (! $tenant) {
            throw new InvalidArgumentException('Referrer sin tenant.');
        }

        if ($referredEmail !== null) {
            $existing = Referral::query()
                ->where('tenant_id', $tenant->id)
                ->where('referrer_user_id', $referrer->id)
                ->where('referred_email', strtolower($referredEmail))
                ->where('status', Referral::STATUS_PENDING)
                ->first();
            if ($existing) {
                return $existing;
            }
        }

        return Referral::create([
            'tenant_id'             => $tenant->id,
            'referrer_user_id'      => $referrer->id,
            'referred_email'        => $referredEmail ? strtolower($referredEmail) : null,
            'code'                  => Referral::newCode($tenant->slug),
            'status'                => Referral::STATUS_PENDING,
            'reward_referrer_cents' => 15000,
            'reward_referred_cents' => 10000,
            'expires_at'            => now()->addDays($expiresInDays),
        ]);
    }
}

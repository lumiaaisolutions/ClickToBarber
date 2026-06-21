<?php

declare(strict_types=1);

namespace App\Domain\Growth\Services;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Growth\Models\LoyaltyProgram;
use App\Domain\Growth\Models\LoyaltyReward;
use App\Domain\Growth\Models\LoyaltyVisit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Acredita una visita en el programa de loyalty cuando una cita se completa.
 *
 * Reglas:
 *  - Solo cuenta `completed`. `cancelled` / `no_show` no acreditan.
 *  - Idempotente: appointment_id es UNIQUE en loyalty_visits.
 *  - Si tras la visita el contador de visitas válidas cliente
 *    es múltiplo de `every_n_visits`, emite una `LoyaltyReward` automática.
 */
final class AwardLoyaltyVisit
{
    public function execute(Appointment $appointment): ?LoyaltyReward
    {
        if (! $appointment->client_id) {
            return null;
        }

        $program = LoyaltyProgram::query()
            ->where('tenant_id', $appointment->tenant_id)
            ->first();

        if (! $program || ! $program->is_active) {
            return null;
        }

        return DB::transaction(function () use ($appointment, $program) {
            // Idempotencia: si ya existe la visita, no contar de nuevo.
            $visit = LoyaltyVisit::query()
                ->where('appointment_id', $appointment->id)
                ->first();

            if (! $visit) {
                $visit = LoyaltyVisit::create([
                    'tenant_id'      => $appointment->tenant_id,
                    'user_id'        => $appointment->client_id,
                    'appointment_id' => $appointment->id,
                    'credited_at'    => now(),
                ]);
            }

            $totalVisits = LoyaltyVisit::query()
                ->where('tenant_id', $appointment->tenant_id)
                ->where('user_id', $appointment->client_id)
                ->count();

            if ($totalVisits === 0 || $totalVisits % $program->every_n_visits !== 0) {
                return null;
            }

            // Emite recompensa
            $reward = LoyaltyReward::create([
                'tenant_id'    => $appointment->tenant_id,
                'user_id'      => $appointment->client_id,
                'code'         => LoyaltyReward::newCode(),
                'reward_type'  => $program->reward_type,
                'reward_value' => $program->reward_value,
                'reward_label' => $program->reward_label,
                'issued_at'    => now(),
                'expires_at'   => $program->expiry_days > 0
                    ? now()->addDays($program->expiry_days)
                    : null,
            ]);

            Log::info('Loyalty reward issued', [
                'tenant'  => $appointment->tenant_id,
                'user'    => $appointment->client_id,
                'reward'  => $reward->code,
                'visits'  => $totalVisits,
            ]);

            return $reward;
        });
    }
}

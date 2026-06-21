<?php

declare(strict_types=1);

namespace App\Domain\Growth\Listeners;

use App\Domain\Appointments\Events\AppointmentCompleted;
use App\Domain\Appointments\Models\Appointment;
use App\Domain\Growth\Models\Referral;
use App\Domain\Growth\Services\AwardLoyaltyVisit;
use Illuminate\Support\Facades\DB;

/**
 * Cuando una cita se marca completed:
 *   - Acredita visita de loyalty (puede emitir recompensa automática).
 *   - Si el cliente fue traído por un referral pending → marcar completed
 *     y disparar la lógica de recompensa al referidor (TODO: emisión de
 *     crédito real cuando se conecte a billing).
 */
final class HandleAppointmentCompleted
{
    public function __construct(private AwardLoyaltyVisit $loyalty) {}

    public function handle(AppointmentCompleted $event): void
    {
        $appt = Appointment::query()
            ->withoutGlobalScopes()
            ->find($event->appointmentId);
        if (! $appt) {
            return;
        }

        $this->loyalty->execute($appt);

        if ($appt->client_id) {
            $referral = Referral::query()
                ->where('referred_user_id', $appt->client_id)
                ->where('status', Referral::STATUS_SIGNED_UP)
                ->first();
            if ($referral) {
                DB::transaction(function () use ($referral, $appt) {
                    $referral->forceFill([
                        'status'               => Referral::STATUS_COMPLETED,
                        'first_appointment_id' => $appt->id,
                        'completed_at'         => now(),
                    ])->save();
                });
            }
        }
    }
}

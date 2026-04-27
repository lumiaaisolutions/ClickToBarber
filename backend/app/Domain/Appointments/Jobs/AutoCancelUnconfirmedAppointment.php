<?php

declare(strict_types=1);

namespace App\Domain\Appointments\Jobs;

use App\Domain\Appointments\Repositories\Contracts\AppointmentRepository;
use App\Domain\Appointments\Services\CancelAppointment;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Recorre citas pendientes cuya hora de inicio está a ≤1h de ahora
 * y las cancela como no-show (con retención de depósito).
 */
final class AutoCancelUnconfirmedAppointment implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function uniqueId(): string
    {
        return 'auto-cancel-unconfirmed';
    }

    public function handle(AppointmentRepository $repo, CancelAppointment $cancel): void
    {
        $cutoff = CarbonImmutable::now()->addHour();

        foreach ($repo->pendingConfirmationOlderThan($cutoff) as $appt) {
            if ($appt->status === AppointmentStatus::PendingConfirmation) {
                $cancel->execute(
                    appointmentId: $appt->id,
                    reason: 'Sin confirmación a 1h del inicio. Depósito retenido.',
                    by: 'system',
                    forfeitDeposit: true,
                );
            }
        }
    }
}

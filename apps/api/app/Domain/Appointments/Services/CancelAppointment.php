<?php

declare(strict_types=1);

namespace App\Domain\Appointments\Services;

use App\Domain\Appointments\Events\AppointmentCancelled;
use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\Models\AppointmentStatusHistory;
use App\Domain\Appointments\Repositories\Contracts\AppointmentRepository;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use Illuminate\Support\Facades\DB;

final class CancelAppointment
{
    public function __construct(private AppointmentRepository $repository) {}

    /**
     * @param  string  $by  'system'|'client'|'admin'
     * @param  bool    $forfeitDeposit  true para no-show: el depósito queda retenido
     */
    public function execute(int $appointmentId, string $reason, string $by = 'admin', bool $forfeitDeposit = false): Appointment
    {
        return DB::transaction(function () use ($appointmentId, $reason, $by, $forfeitDeposit) {
            $appointment = $this->repository->find($appointmentId);
            abort_if(! $appointment, 404, 'Cita no encontrada');

            if (! $appointment->status->canBeCancelled()) {
                return $appointment;
            }

            $from = $appointment->status->value;
            $appointment->status              = AppointmentStatus::Cancelled;
            $appointment->cancelled_at        = now();
            $appointment->cancelled_by        = $by;
            $appointment->cancellation_reason = $reason;
            if ($forfeitDeposit && $appointment->deposit_status === 'captured') {
                $appointment->deposit_status = 'forfeited';
            }
            $appointment = $this->repository->save($appointment);

            AppointmentStatusHistory::create([
                'tenant_id'      => $appointment->tenant_id,
                'appointment_id' => $appointment->id,
                'from_status'    => $from,
                'to_status'      => AppointmentStatus::Cancelled->value,
                'actor'          => $by,
                'context'        => ['reason' => $reason, 'forfeit_deposit' => $forfeitDeposit],
                'created_at'     => now(),
            ]);

            AppointmentCancelled::dispatch($appointment->id, $appointment->tenant_id, $reason, $by);

            return $appointment;
        });
    }
}

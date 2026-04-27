<?php

declare(strict_types=1);

namespace App\Domain\Appointments\Services;

use App\Domain\Appointments\Events\AppointmentConfirmed;
use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\Models\AppointmentStatusHistory;
use App\Domain\Appointments\Repositories\Contracts\AppointmentRepository;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use Illuminate\Support\Facades\DB;

final class ConfirmAppointment
{
    public function __construct(private AppointmentRepository $repository) {}

    public function execute(int $appointmentId, string $actor = 'client'): Appointment
    {
        return DB::transaction(function () use ($appointmentId, $actor) {
            $appointment = $this->repository->find($appointmentId);
            abort_if(! $appointment, 404, 'Cita no encontrada');

            if ($appointment->status === AppointmentStatus::Confirmed) {
                return $appointment;
            }

            $from = $appointment->status->value;
            $appointment->status       = AppointmentStatus::Confirmed;
            $appointment->confirmed_at = now();
            $appointment = $this->repository->save($appointment);

            AppointmentStatusHistory::create([
                'tenant_id'      => $appointment->tenant_id,
                'appointment_id' => $appointment->id,
                'from_status'    => $from,
                'to_status'      => AppointmentStatus::Confirmed->value,
                'actor'          => $actor,
                'context'        => null,
                'created_at'     => now(),
            ]);

            AppointmentConfirmed::dispatch($appointment->id, $appointment->tenant_id);

            return $appointment;
        });
    }
}

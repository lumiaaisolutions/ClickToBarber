<?php

declare(strict_types=1);

namespace App\Domain\Appointments\Services;

use App\Domain\Appointments\Events\AppointmentCompleted;
use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\Models\AppointmentStatusHistory;
use App\Domain\Appointments\Repositories\Contracts\AppointmentRepository;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use Illuminate\Support\Facades\DB;

final class CompleteAppointment
{
    public function __construct(private AppointmentRepository $repository) {}

    public function execute(int $appointmentId, string $actor = 'admin'): Appointment
    {
        return DB::transaction(function () use ($appointmentId, $actor) {
            $appt = $this->repository->find($appointmentId);
            abort_if(! $appt, 404, 'Cita no encontrada');

            if ($appt->status === AppointmentStatus::Completed) {
                return $appt;
            }

            $from = $appt->status->value;
            $appt->status = AppointmentStatus::Completed;
            $appt = $this->repository->save($appt);

            AppointmentStatusHistory::create([
                'tenant_id'      => $appt->tenant_id,
                'appointment_id' => $appt->id,
                'from_status'    => $from,
                'to_status'      => AppointmentStatus::Completed->value,
                'actor'          => $actor,
                'context'        => null,
                'created_at'     => now(),
            ]);

            AppointmentCompleted::dispatch($appt->id, $appt->tenant_id);

            return $appt;
        });
    }
}

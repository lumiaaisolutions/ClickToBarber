<?php

declare(strict_types=1);

namespace App\Http\Client\Controllers;

use App\Domain\Appointments\Services\ConfirmAppointment;
use App\Http\Client\Resources\AppointmentResource;

final class ConfirmAppointmentController
{
    public function __construct(private ConfirmAppointment $confirm) {}

    public function __invoke(int $id)
    {
        return new AppointmentResource($this->confirm->execute($id, 'client'));
    }
}

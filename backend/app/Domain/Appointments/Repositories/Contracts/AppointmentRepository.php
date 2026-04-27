<?php

declare(strict_types=1);

namespace App\Domain\Appointments\Repositories\Contracts;

use App\Domain\Appointments\Models\Appointment;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

interface AppointmentRepository
{
    public function find(int $id): ?Appointment;

    public function existsConflict(int $barberId, CarbonInterface $startsAt, CarbonInterface $endsAt): bool;

    public function forBarberOnDate(int $barberId, CarbonInterface $date): Collection;

    public function forTenantBetween(string $tenantId, CarbonInterface $from, CarbonInterface $to): Collection;

    public function pendingConfirmationOlderThan(CarbonInterface $cutoff): Collection;

    public function save(Appointment $appointment): Appointment;
}

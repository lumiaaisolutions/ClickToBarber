<?php

declare(strict_types=1);

namespace App\Domain\Appointments\Repositories;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\Repositories\Contracts\AppointmentRepository;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use App\Infrastructure\Persistence\Tenancy\TenantScope;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

final class EloquentAppointmentRepository implements AppointmentRepository
{
    public function find(int $id): ?Appointment
    {
        return Appointment::with(['barber', 'service', 'client'])->find($id);
    }

    public function existsConflict(int $barberId, CarbonInterface $startsAt, CarbonInterface $endsAt): bool
    {
        return Appointment::query()
            ->where('barber_id', $barberId)
            ->whereNotIn('status', [
                AppointmentStatus::Cancelled->value,
                AppointmentStatus::NoShow->value,
            ])
            ->where(function ($q) use ($startsAt, $endsAt) {
                $q->whereBetween('starts_at', [$startsAt, $endsAt])
                  ->orWhereBetween('ends_at', [$startsAt, $endsAt])
                  ->orWhere(function ($q2) use ($startsAt, $endsAt) {
                      $q2->where('starts_at', '<=', $startsAt)
                         ->where('ends_at', '>=', $endsAt);
                  });
            })
            ->exists();
    }

    public function forBarberOnDate(int $barberId, CarbonInterface $date): Collection
    {
        return Appointment::with(['service', 'client'])
            ->where('barber_id', $barberId)
            ->whereDate('starts_at', $date->toDateString())
            ->orderBy('starts_at')
            ->get();
    }

    public function forTenantBetween(string $tenantId, CarbonInterface $from, CarbonInterface $to): Collection
    {
        return Appointment::withoutGlobalScope(TenantScope::class)
            ->with(['barber', 'service', 'client'])
            ->where('tenant_id', $tenantId)
            ->whereBetween('starts_at', [$from, $to])
            ->orderBy('starts_at')
            ->get();
    }

    public function pendingConfirmationOlderThan(CarbonInterface $cutoff): Collection
    {
        return Appointment::withoutGlobalScope(TenantScope::class)
            ->where('status', AppointmentStatus::PendingConfirmation->value)
            ->where('starts_at', '<=', $cutoff)
            ->get();
    }

    public function save(Appointment $appointment): Appointment
    {
        $appointment->save();
        return $appointment->fresh(['barber', 'service', 'client']);
    }
}

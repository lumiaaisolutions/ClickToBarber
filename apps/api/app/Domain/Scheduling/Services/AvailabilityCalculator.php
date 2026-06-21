<?php

declare(strict_types=1);

namespace App\Domain\Scheduling\Services;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use App\Domain\Catalog\Models\Service;
use App\Domain\Scheduling\Models\BusinessHour;
use App\Domain\Staff\Models\Barber;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterval;
use Illuminate\Support\Collection;

final class AvailabilityCalculator
{
    /**
     * Devuelve los slots disponibles para un barbero+servicio en una fecha dada.
     *
     * @return array<int, array{starts_at:string,ends_at:string,available:bool}>
     */
    public function slotsFor(Barber $barber, Service $service, CarbonImmutable $date): array
    {
        $weekday = (int) $date->dayOfWeek;
        $tenantId = $barber->tenant_id;

        $hours = BusinessHour::forTenant($tenantId)
            ->where('weekday', $weekday)
            ->where('is_closed', false)
            ->first();

        if (! $hours) {
            return [];
        }

        $shift = $barber->shifts()->where('weekday', $weekday)->first();
        $opens  = $date->setTimeFromTimeString($shift?->start_time ?? $hours->open_time);
        $closes = $date->setTimeFromTimeString($shift?->end_time ?? $hours->close_time);

        $duration = (int) ($service->duration_minutes ?: $barber->default_slot_minutes);
        $step = CarbonInterval::minutes($duration);

        $existing = Appointment::query()
            ->where('barber_id', $barber->id)
            ->whereDate('starts_at', $date->toDateString())
            ->whereNotIn('status', [
                AppointmentStatus::Cancelled->value,
                AppointmentStatus::NoShow->value,
            ])
            ->get(['starts_at', 'ends_at'])
            ->map(fn ($a) => [
                'start' => $a->starts_at->copy(),
                'end'   => $a->ends_at->copy(),
            ]);

        $slots = [];
        $cursor = $opens->copy();
        $now = CarbonImmutable::now($date->getTimezone());

        while ($cursor->copy()->add($step)->lte($closes)) {
            $slotEnd = $cursor->copy()->add($step);
            $available = $cursor->gte($now) && ! $this->collides($existing, $cursor, $slotEnd);
            $slots[] = [
                'starts_at' => $cursor->toIso8601String(),
                'ends_at'   => $slotEnd->toIso8601String(),
                'available' => $available,
            ];
            $cursor = $slotEnd;
        }

        return $slots;
    }

    private function collides(Collection $existing, CarbonImmutable $start, CarbonImmutable $end): bool
    {
        foreach ($existing as $appt) {
            if ($start->lt($appt['end']) && $end->gt($appt['start'])) {
                return true;
            }
        }
        return false;
    }
}

<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Appointments\DTOs\BookAppointmentInput;
use App\Domain\Appointments\Exceptions\SlotAlreadyBooked;
use App\Domain\Appointments\Services\BookAppointment;
use App\Domain\Operations\Models\AppointmentRecurrence;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

/**
 * Materializa próximas citas recurrentes hasta 21 días en el futuro.
 *
 *   php artisan lumia:materialize-recurrences
 *
 * Se programa diario en console.php. Idempotente: si ya hay cita
 * concreta en ese slot, salta (SlotAlreadyBooked es benigno).
 */
final class MaterializeRecurringAppointmentsCommand extends Command
{
    protected $signature = 'lumia:materialize-recurrences {--days=21}';
    protected $description = 'Crea citas concretas a partir de las series recurrentes activas';

    public function handle(BookAppointment $book): int
    {
        $horizon = (int) $this->option('days');
        $today = CarbonImmutable::today();
        $cutoff = $today->addDays($horizon);

        $createdCount = 0;
        $skippedCount = 0;

        AppointmentRecurrence::query()
            ->where('is_active', true)
            ->whereDate('starts_on', '<=', $cutoff)
            ->where(function ($q) use ($today) {
                $q->whereNull('ends_on')->orWhereDate('ends_on', '>=', $today);
            })
            ->with(['user', 'barber', 'service'])
            ->chunk(50, function ($rules) use ($today, $cutoff, &$createdCount, &$skippedCount, $book) {
                foreach ($rules as $rule) {
                    foreach ($this->datesFor($rule, $today, $cutoff) as $date) {
                        $startsAt = $date->setTimeFromTimeString((string) $rule->time_local);

                        try {
                            $book->execute(new BookAppointmentInput(
                                tenantId:    $rule->tenant_id,
                                barberId:    $rule->barber_id,
                                serviceId:   $rule->service_id,
                                clientName:  $rule->user?->name ?? 'Cliente recurrente',
                                clientEmail: $rule->user?->email ?? 'recurring@lumia.local',
                                clientPhone: $rule->user?->phone,
                                startsAt:    $startsAt->toIso8601String(),
                            ));
                            $createdCount++;
                        } catch (SlotAlreadyBooked) {
                            $skippedCount++;
                        }
                    }

                    $rule->forceFill(['last_materialized_at' => now()])->save();
                }
            });

        $this->info("Creadas: $createdCount · Skipped (slot ya tomado): $skippedCount");
        return self::SUCCESS;
    }

    /** @return iterable<CarbonImmutable> */
    private function datesFor(AppointmentRecurrence $rule, CarbonImmutable $from, CarbonImmutable $to): iterable
    {
        $cursor = $from;
        while ($cursor->lte($to)) {
            $matches = match ($rule->frequency) {
                AppointmentRecurrence::FREQ_WEEKLY    => $rule->weekday !== null && (int) $cursor->dayOfWeek === (int) $rule->weekday,
                AppointmentRecurrence::FREQ_BIWEEKLY  => $rule->weekday !== null
                    && (int) $cursor->dayOfWeek === (int) $rule->weekday
                    && $cursor->diffInWeeks(CarbonImmutable::parse($rule->starts_on)) % 2 === 0,
                AppointmentRecurrence::FREQ_MONTHLY   => $rule->day_of_month !== null
                    && (int) $cursor->day === (int) $rule->day_of_month,
                default => false,
            };

            if ($matches && $cursor->gte(CarbonImmutable::parse($rule->starts_on))) {
                yield $cursor;
            }

            $cursor = $cursor->addDay();
        }
    }
}

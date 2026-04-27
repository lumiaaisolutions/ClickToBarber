<?php

declare(strict_types=1);

use App\Domain\Appointments\DTOs\BookAppointmentInput;
use App\Domain\Appointments\Services\BookAppointment;
use App\Domain\Scheduling\Services\AvailabilityCalculator;
use Illuminate\Support\Facades\Event;

it('devuelve slots vacíos en día cerrado', function () {
    $demo = createDemoTenant();
    // Lunes (weekday 1) está cerrado en createDemoTenant.
    $monday = nextOpenSlot($demo['tenant'])->next(Carbon\CarbonImmutable::MONDAY)->setTime(11, 0);

    $slots = app(AvailabilityCalculator::class)
        ->slotsFor($demo['barber'], $demo['service'], $monday);

    expect($slots)->toBe([]);
});

it('genera slots respetando duración del servicio y horario del barbero', function () {
    $demo = createDemoTenant();
    $tuesday = nextOpenSlot($demo['tenant']);

    $slots = app(AvailabilityCalculator::class)
        ->slotsFor($demo['barber'], $demo['service'], $tuesday);

    // Servicio dura 60 min, horario 10:00-19:00 → 9 slots.
    expect($slots)->toHaveCount(9)
        ->and($slots[0]['starts_at'])->toContain('T10:00:00')
        ->and(end($slots)['starts_at'])->toContain('T18:00:00');
});

it('marca como no disponible un slot ocupado por una cita activa', function () {
    Event::fake();
    $demo = createDemoTenant();
    $startsAt = nextOpenSlot($demo['tenant']); // martes 11:00

    app(BookAppointment::class)->execute(new BookAppointmentInput(
        tenantId: $demo['tenant']->id,
        barberId: $demo['barber']->id,
        serviceId: $demo['service']->id,
        clientName: 'Bloqueador',
        clientEmail: 'block@test.local',
        clientPhone: '+5215511114444',
        startsAt: $startsAt->toIso8601String(),
    ));

    $slots = app(AvailabilityCalculator::class)
        ->slotsFor($demo['barber'], $demo['service'], $startsAt);

    $slot11 = collect($slots)->firstWhere('starts_at', $startsAt->toIso8601String());
    expect($slot11)->not->toBeNull()
        ->and($slot11['available'])->toBeFalse();
});

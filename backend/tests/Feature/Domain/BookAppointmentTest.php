<?php

declare(strict_types=1);

use App\Domain\Appointments\DTOs\BookAppointmentInput;
use App\Domain\Appointments\Events\AppointmentBooked;
use App\Domain\Appointments\Exceptions\SlotAlreadyBooked;
use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\Services\BookAppointment;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use Illuminate\Support\Facades\Event;

it('reserva una cita con depósito calculado y estado pendiente', function () {
    Event::fake();
    ['tenant' => $t, 'barber' => $b, 'service' => $s] = createDemoTenant();

    $startsAt = nextOpenSlot($t);

    $appt = app(BookAppointment::class)->execute(new BookAppointmentInput(
        tenantId:    $t->id,
        barberId:    $b->id,
        serviceId:   $s->id,
        clientName:  'Cliente Pest',
        clientEmail: 'pest-client@test.local',
        clientPhone: '+5215511112222',
        startsAt:    $startsAt->toIso8601String(),
        notes:       'sin patillas',
    ));

    expect($appt)
        ->toBeInstanceOf(Appointment::class)
        ->and($appt->status)->toBe(AppointmentStatus::PendingConfirmation)
        ->and($appt->price_cents)->toBe(30000)
        ->and($appt->deposit_cents)->toBe(9000) // 30% de 30000
        ->and($appt->deposit_status)->toBe('pending')
        ->and(abs((float) $appt->starts_at->diffInMinutes($appt->ends_at)))->toBe(60.0);

    Event::assertDispatched(AppointmentBooked::class);
});

it('rechaza una segunda reserva en el mismo slot del mismo barbero', function () {
    Event::fake();
    ['tenant' => $t, 'barber' => $b, 'service' => $s] = createDemoTenant();
    $startsAt = nextOpenSlot($t);

    $book = app(BookAppointment::class);
    $book->execute(new BookAppointmentInput(
        tenantId: $t->id, barberId: $b->id, serviceId: $s->id,
        clientName: 'Primero', clientEmail: 'first@test.local',
        clientPhone: '+521555000001', startsAt: $startsAt->toIso8601String(),
    ));

    $second = fn () => $book->execute(new BookAppointmentInput(
        tenantId: $t->id, barberId: $b->id, serviceId: $s->id,
        clientName: 'Segundo', clientEmail: 'second@test.local',
        clientPhone: '+521555000002', startsAt: $startsAt->toIso8601String(),
    ));

    expect($second)->toThrow(SlotAlreadyBooked::class);
});

it('reutiliza al cliente cuando el email coincide', function () {
    Event::fake();
    ['tenant' => $t, 'barber' => $b, 'service' => $s] = createDemoTenant();

    $book = app(BookAppointment::class);
    $first = $book->execute(new BookAppointmentInput(
        tenantId: $t->id, barberId: $b->id, serviceId: $s->id,
        clientName: 'Recurrente', clientEmail: 'recurrente@test.local',
        clientPhone: '+5215511110000', startsAt: nextOpenSlot($t)->toIso8601String(),
    ));

    $second = $book->execute(new BookAppointmentInput(
        tenantId: $t->id, barberId: $b->id, serviceId: $s->id,
        clientName: 'Recurrente', clientEmail: 'recurrente@test.local',
        clientPhone: '+5215511110000', startsAt: nextOpenSlot($t)->addHours(2)->toIso8601String(),
    ));

    expect($first->client_id)->toBe($second->client_id);
});

<?php

declare(strict_types=1);

use App\Domain\Appointments\DTOs\BookAppointmentInput;
use App\Domain\Appointments\Events\AppointmentCancelled;
use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\Services\BookAppointment;
use App\Domain\Appointments\Services\CancelAppointment;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    Event::fake();
    $demo = createDemoTenant();
    $this->demo = $demo;
    $this->appt = app(BookAppointment::class)->execute(new BookAppointmentInput(
        tenantId: $demo['tenant']->id,
        barberId: $demo['barber']->id,
        serviceId: $demo['service']->id,
        clientName: 'Cliente Cancel',
        clientEmail: 'cancel@test.local',
        clientPhone: '+5215511110002',
        startsAt: nextOpenSlot($demo['tenant'])->toIso8601String(),
    ));
});

it('cancela una cita y dispara evento', function () {
    $cancelled = app(CancelAppointment::class)
        ->execute($this->appt->id, reason: 'cliente cambió de planes', by: 'client');

    expect($cancelled->status)->toBe(AppointmentStatus::Cancelled)
        ->and($cancelled->cancelled_by)->toBe('client')
        ->and($cancelled->cancellation_reason)->toBe('cliente cambió de planes');

    Event::assertDispatched(AppointmentCancelled::class);
});

it('retiene el depósito (forfeit) si la opción está activa y el depósito está capturado', function () {
    Appointment::withoutGlobalScopes()
        ->where('id', $this->appt->id)
        ->update(['deposit_status' => 'captured']);

    $cancelled = app(CancelAppointment::class)
        ->execute($this->appt->id, reason: 'no-show', by: 'system', forfeitDeposit: true);

    expect($cancelled->deposit_status)->toBe('forfeited');
});

it('no cancela citas ya completadas (no-op silencioso)', function () {
    Appointment::withoutGlobalScopes()
        ->where('id', $this->appt->id)
        ->update(['status' => AppointmentStatus::Completed->value]);

    $result = app(CancelAppointment::class)
        ->execute($this->appt->id, reason: 'tarde', by: 'admin');

    expect($result->status)->toBe(AppointmentStatus::Completed);
});

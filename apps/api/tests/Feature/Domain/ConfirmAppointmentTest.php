<?php

declare(strict_types=1);

use App\Domain\Appointments\DTOs\BookAppointmentInput;
use App\Domain\Appointments\Events\AppointmentBooked;
use App\Domain\Appointments\Events\AppointmentConfirmed;
use App\Domain\Appointments\Models\AppointmentStatusHistory;
use App\Domain\Appointments\Services\BookAppointment;
use App\Domain\Appointments\Services\ConfirmAppointment;
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
        clientName: 'Cliente Confirm',
        clientEmail: 'confirm@test.local',
        clientPhone: '+5215511110001',
        startsAt: nextOpenSlot($demo['tenant'])->toIso8601String(),
    ));
});

it('confirma una cita pendiente y registra historial', function () {
    $confirmed = app(ConfirmAppointment::class)->execute($this->appt->id, actor: 'client');

    expect($confirmed->status)->toBe(AppointmentStatus::Confirmed)
        ->and($confirmed->confirmed_at)->not->toBeNull();

    $history = AppointmentStatusHistory::where('appointment_id', $confirmed->id)
        ->where('to_status', AppointmentStatus::Confirmed->value)
        ->first();
    expect($history)->not->toBeNull()
        ->and($history->actor)->toBe('client');

    Event::assertDispatched(AppointmentConfirmed::class);
});

it('es idempotente: confirmar dos veces no duplica historial ni evento', function () {
    $confirm = app(ConfirmAppointment::class);
    $first = $confirm->execute($this->appt->id);
    $second = $confirm->execute($this->appt->id);

    expect($first->id)->toBe($second->id)
        ->and($second->status)->toBe(AppointmentStatus::Confirmed);

    $count = AppointmentStatusHistory::where('appointment_id', $this->appt->id)
        ->where('to_status', AppointmentStatus::Confirmed->value)
        ->count();
    expect($count)->toBe(1);

    Event::assertDispatchedTimes(AppointmentConfirmed::class, 1);
});

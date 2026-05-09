<?php

declare(strict_types=1);

namespace App\Domain\Platform\Listeners;

use App\Domain\Appointments\Events\AppointmentBooked;
use App\Domain\Appointments\Events\AppointmentCancelled;
use App\Domain\Appointments\Events\AppointmentCompleted;
use App\Domain\Appointments\Events\AppointmentConfirmed;
use App\Domain\Appointments\Models\Appointment;
use App\Domain\Platform\Services\OutboundWebhookDispatcher;

/**
 * Listener que traduce eventos de dominio LUMIA al formato externo de
 * webhooks salientes. Ejecuta `OutboundWebhookDispatcher` con el tenant_id
 * y los datos relevantes.
 */
final class BroadcastDomainEvent
{
    public function __construct(private OutboundWebhookDispatcher $dispatcher) {}

    public function handle(object $event): void
    {
        $type = match (true) {
            $event instanceof AppointmentBooked    => 'appointment.booked',
            $event instanceof AppointmentConfirmed => 'appointment.confirmed',
            $event instanceof AppointmentCancelled => 'appointment.cancelled',
            $event instanceof AppointmentCompleted => 'appointment.completed',
            default => null,
        };
        if (! $type) {
            return;
        }

        $appt = Appointment::query()
            ->withoutGlobalScopes()
            ->with(['service:id,name', 'barber:id,name', 'client:id,name,email'])
            ->find($event->appointmentId);
        if (! $appt) {
            return;
        }

        $this->dispatcher->fire(
            tenantId: $event->tenantId,
            eventType: $type,
            data: [
                'appointment_id' => $appt->id,
                'starts_at'      => $appt->starts_at->toIso8601String(),
                'ends_at'        => $appt->ends_at->toIso8601String(),
                'status'         => $appt->status->value,
                'service'        => $appt->service?->only(['id', 'name']),
                'barber'         => $appt->barber?->only(['id', 'name']),
                'client'         => $appt->client?->only(['id', 'name', 'email']),
                'price_cents'    => $appt->price_cents,
                'deposit_cents'  => $appt->deposit_cents,
            ],
        );
    }
}

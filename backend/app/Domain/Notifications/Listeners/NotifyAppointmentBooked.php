<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Listeners;

use App\Domain\Appointments\Events\AppointmentBooked;
use App\Domain\Appointments\Models\Appointment;
use App\Domain\Notifications\Services\SendWhatsapp;

final class NotifyAppointmentBooked
{
    public function __construct(private SendWhatsapp $whatsapp) {}

    public function handle(AppointmentBooked $event): void
    {
        $appt = Appointment::with(['client', 'service', 'barber', 'tenant'])
            ->withoutGlobalScopes()
            ->find($event->appointmentId);

        if (! $appt || ! $appt->client?->phone) {
            return;
        }

        $this->whatsapp->execute(
            tenantId: $event->tenantId,
            to: $appt->client->phone,
            template: 'appointment_booked',
            params: [
                'name'       => $appt->client->name,
                'service'    => $appt->service->name,
                'barber'     => $appt->barber->name,
                'starts_at'  => $appt->starts_at->format('d M Y H:i'),
                'tenant'     => $appt->tenant?->name,
                'deposit_mxn'=> number_format($appt->deposit_cents / 100, 2),
            ],
            userId: $appt->client_id,
            appointmentId: $appt->id,
        );
    }
}

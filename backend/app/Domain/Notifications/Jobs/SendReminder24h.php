<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Jobs;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use App\Domain\Notifications\Services\SendWhatsapp;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable as QueueableTrait;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Recordatorio amigable 24h antes de la cita.
 *
 * Se programa con `delay(...)` en `BookAppointment::execute()`.
 * Si la cita está cancelada al momento de ejecución, no envía nada.
 */
final class SendReminder24h implements ShouldQueue
{
    use QueueableTrait, InteractsWithQueue, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(public readonly int $appointmentId) {}

    public function handle(SendWhatsapp $whatsapp): void
    {
        $appt = Appointment::query()
            ->withoutGlobalScopes()
            ->with(['client', 'service', 'barber', 'tenant'])
            ->find($this->appointmentId);

        if (! $appt || ! $appt->client?->phone) {
            return;
        }
        if (! in_array($appt->status, [AppointmentStatus::PendingConfirmation, AppointmentStatus::Confirmed], true)) {
            return; // ya cancelada / completada
        }

        $whatsapp->execute(
            tenantId: $appt->tenant_id,
            to: (string) $appt->client->phone,
            template: 'reminder_24h',
            params: [
                'name'      => $appt->client->name,
                'service'   => $appt->service->name,
                'barber'    => $appt->barber->name,
                'starts_at' => $appt->starts_at->format('d M Y H:i'),
                'tenant'    => $appt->tenant?->name,
            ],
            userId: $appt->client_id,
            appointmentId: $appt->id,
        );
    }
}

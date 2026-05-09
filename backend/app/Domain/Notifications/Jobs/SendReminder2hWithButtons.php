<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Jobs;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use App\Domain\Notifications\Services\SendWhatsapp;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Recordatorio T-2h con quick replies (Confirmar / Reagendar / Cancelar).
 *
 * El payload del botón es `confirm:<id>` / `reschedule:<id>` / `cancel:<id>`.
 * El webhook de Meta (`WhatsappWebhookController`) lo recibe y dispara
 * `ConfirmAppointment` / `CancelAppointment` automáticamente.
 */
final class SendReminder2hWithButtons implements ShouldQueue
{
    use Queueable, InteractsWithQueue, SerializesModels;

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
            return;
        }

        $whatsapp->execute(
            tenantId: $appt->tenant_id,
            to: (string) $appt->client->phone,
            template: 'reminder_2h',
            params: [
                'name'           => $appt->client->name,
                'service'        => $appt->service->name,
                'barber'         => $appt->barber->name,
                'starts_at'      => $appt->starts_at->format('H:i'),
                'tenant'         => $appt->tenant?->name,
                'btn_confirm'    => 'confirm:' . $appt->id,
                'btn_reschedule' => 'reschedule:' . $appt->id,
                'btn_cancel'     => 'cancel:' . $appt->id,
            ],
            userId: $appt->client_id,
            appointmentId: $appt->id,
        );
    }
}

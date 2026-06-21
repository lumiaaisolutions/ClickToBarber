<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Jobs;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\Services\CancelAppointment;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use App\Domain\Notifications\Services\PlaceVoiceCall;
use App\Domain\Notifications\Services\SendWhatsapp;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;

/**
 * T-1h: si la cita NO está confirmada, cancela + retiene depósito + notifica.
 *
 * Lock distribuido por Cache::lock(key, 60s) — evita doble ejecución en flota
 * multi-worker. Si otro worker ya cancela, este simplemente retorna.
 */
final class AutoCancelUnconfirmedAppointment implements ShouldQueue
{
    use Queueable, InteractsWithQueue, SerializesModels;

    public int $tries = 1;

    public function __construct(public readonly int $appointmentId) {}

    public function handle(CancelAppointment $cancel, SendWhatsapp $whatsapp, PlaceVoiceCall $voice): void
    {
        $lock = Cache::lock('autocancel:' . $this->appointmentId, 60);
        if (! $lock->get()) {
            return;
        }

        try {
            $appt = Appointment::query()
                ->withoutGlobalScopes()
                ->with('client', 'tenant')
                ->find($this->appointmentId);

            if (! $appt) {
                return;
            }

            // Sólo cancelamos si sigue pendiente de confirmación.
            if ($appt->status !== AppointmentStatus::PendingConfirmation) {
                return;
            }

            $cancel->execute(
                appointmentId: $appt->id,
                reason: 'Sin confirmación 1h antes de la cita.',
                by: 'system:auto_cancel',
                forfeitDeposit: true,
            );

            if ($appt->client?->phone) {
                $whatsapp->execute(
                    tenantId: $appt->tenant_id,
                    to: (string) $appt->client->phone,
                    template: 'cancelled',
                    params: [
                        'name'          => $appt->client->name,
                        'starts_at'     => $appt->starts_at->format('d M H:i'),
                        'tenant'        => $appt->tenant?->name,
                        'deposit_status' => 'retenido',
                    ],
                    userId: $appt->client_id,
                    appointmentId: $appt->id,
                );

                // Fallback de voz: llamada saliente con TTS para confirmar la
                // cancelación. Sólo se dispara si la barbería habilitó
                // explícitamente Twilio (driver != log).
                if (config('services.twilio.driver', 'log') === 'twilio') {
                    $voice->execute(
                        tenantId: $appt->tenant_id,
                        to: (string) $appt->client->phone,
                        say: sprintf(
                            'Hola %s. Tu cita en %s a las %s fue cancelada por falta de confirmación. Tu depósito quedó retenido. Si fue un error, comunícate con nosotros.',
                            $appt->client->name,
                            $appt->tenant?->name ?? 'la barbería',
                            $appt->starts_at->format('H:i'),
                        ),
                        userId: $appt->client_id,
                        appointmentId: $appt->id,
                    );
                }
            }
        } finally {
            $lock->release();
        }
    }
}

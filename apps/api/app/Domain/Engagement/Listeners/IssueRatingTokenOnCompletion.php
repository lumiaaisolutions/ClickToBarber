<?php

declare(strict_types=1);

namespace App\Domain\Engagement\Listeners;

use App\Domain\Appointments\Events\AppointmentCompleted;
use App\Domain\Appointments\Models\Appointment;
use App\Domain\Engagement\Models\Rating;
use App\Domain\Notifications\Services\SendWhatsapp;
use Illuminate\Support\Facades\Log;

/**
 * Cuando una cita termina, se emite un Rating "vacío" con un token de acceso
 * único. El cliente recibe por WhatsApp el link `/r/<token>` que abre la
 * página pública de calificación. Solo permite enviar una vez (UNIQUE en
 * appointment_id).
 */
final class IssueRatingTokenOnCompletion
{
    public function __construct(private SendWhatsapp $whatsapp) {}

    public function handle(AppointmentCompleted $event): void
    {
        $appt = Appointment::query()
            ->withoutGlobalScopes()
            ->with('client', 'barber', 'tenant')
            ->find($event->appointmentId);

        if (! $appt) {
            return;
        }

        $existing = Rating::query()
            ->where('appointment_id', $appt->id)
            ->first();
        if ($existing) {
            return;
        }

        $rating = Rating::create([
            'tenant_id'      => $appt->tenant_id,
            'appointment_id' => $appt->id,
            'user_id'        => $appt->client_id,
            'barber_id'      => $appt->barber_id,
            'stars'          => 0,                // 0 = pendiente; 1..5 = enviado
            'public_token'   => Rating::newToken(),
            'is_published'   => false,
        ]);

        if (! $appt->client?->phone) {
            return;
        }

        $url = sprintf(
            '%s/r/%s',
            rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/'),
            $rating->public_token,
        );

        try {
            $this->whatsapp->execute(
                tenantId: $appt->tenant_id,
                to: (string) $appt->client->phone,
                template: 'post_visit_rating',
                params: [
                    'name'   => $appt->client->name ?? 'cliente',
                    'barber' => $appt->barber->name ?? '',
                    'url'    => $url,
                ],
                userId: $appt->client_id,
                appointmentId: $appt->id,
            );
        } catch (\Throwable $e) {
            Log::warning('Rating WhatsApp falló', ['rating' => $rating->id, 'err' => $e->getMessage()]);
        }
    }
}

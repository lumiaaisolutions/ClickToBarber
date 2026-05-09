<?php

declare(strict_types=1);

namespace App\Domain\Calendar\Listeners;

use App\Domain\Calendar\Jobs\SyncAppointmentToGoogle;

/**
 * Listener genérico que despacha el job de sincronización ante cualquier
 * evento de cita. Se suscribe a Booked, Confirmed, Cancelled, Completed.
 *
 * El job interno verifica si hay conexión activa antes de hacer HTTP.
 */
final class DispatchGoogleSync
{
    public function handle(object $event): void
    {
        $appointmentId = $event->appointmentId ?? null;
        if (! is_int($appointmentId)) {
            return;
        }

        SyncAppointmentToGoogle::dispatch($appointmentId)->afterResponse();
    }
}

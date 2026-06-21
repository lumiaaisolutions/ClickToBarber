<?php

declare(strict_types=1);

namespace App\Http\Public\Controllers;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Staff\Models\Barber;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

/**
 * Feed iCal público por barbero, autenticado por token único en URL.
 *
 *   GET /api/ical/barber/{token}.ics
 *
 * El barbero puede suscribir esa URL en Google Calendar / Apple Calendar
 * para ver sus citas como un calendario externo de sólo lectura. El token
 * está en barbers.ical_feed_token; rotarlo invalida el feed.
 */
final class IcalFeedController extends Controller
{
    public function __invoke(string $token): Response
    {
        $barber = Barber::query()
            ->withoutGlobalScopes()
            ->where('ical_feed_token', $token)
            ->first();

        if (! $barber) {
            return response('Not found', 404);
        }

        $tenant = \App\Domain\Tenancy\Models\Tenant::query()
            ->withoutGlobalScopes()
            ->find($barber->tenant_id);

        $appointments = Appointment::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $barber->tenant_id)
            ->where('barber_id', $barber->id)
            ->whereIn('status', ['pending_confirmation', 'confirmed', 'in_progress'])
            ->where('starts_at', '>=', now()->subDays(7))
            ->where('starts_at', '<=', now()->addDays(60))
            ->orderBy('starts_at')
            ->with(['service:id,name', 'client:id,name'])
            ->get();

        $tz = $tenant?->timezone ?? 'UTC';
        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//LUMIA//Barber Calendar//ES',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:' . $this->escape("{$tenant?->name} · {$barber->name}"),
            'X-WR-TIMEZONE:' . $tz,
        ];

        foreach ($appointments as $a) {
            $start = $a->starts_at->setTimezone('UTC')->format('Ymd\THis\Z');
            $end   = $a->ends_at->setTimezone('UTC')->format('Ymd\THis\Z');
            $uid   = "appt-{$a->id}@lumia";
            $summary = $this->escape(($a->service?->name ?? 'Cita') . ' · ' . ($a->client?->name ?? 'Cliente'));
            $desc = $this->escape("Estado: {$a->status->value}\nDepósito: {$a->deposit_status}");

            $lines = array_merge($lines, [
                'BEGIN:VEVENT',
                "UID:{$uid}",
                'DTSTAMP:' . now()->setTimezone('UTC')->format('Ymd\THis\Z'),
                "DTSTART:{$start}",
                "DTEND:{$end}",
                "SUMMARY:{$summary}",
                "DESCRIPTION:{$desc}",
                "STATUS:" . ($a->status->value === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'),
                'END:VEVENT',
            ]);
        }
        $lines[] = 'END:VCALENDAR';

        return response(implode("\r\n", $lines) . "\r\n", 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

    private function escape(string $s): string
    {
        return str_replace(["\\", ",", ";", "\n"], ["\\\\", "\\,", "\\;", "\\n"], $s);
    }
}

<?php

declare(strict_types=1);

namespace App\Domain\Calendar\Jobs;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use App\Domain\Calendar\Models\CalendarConnection;
use App\Domain\Staff\Models\Barber;
use App\Infrastructure\Integrations\Google\GoogleOauthClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Sincroniza una cita LUMIA → Google Calendar del barbero asignado.
 *
 *  - Si el access_token expiró, hace refresh con `refresh_token`.
 *  - Idempotente: usa `calendar_external_events` para hacer upsert con
 *    el mismo `external_id` cuando la cita se modifica.
 *  - Si la cita está cancelada y existe `external_id`, hace delete.
 */
final class SyncAppointmentToGoogle implements ShouldQueue
{
    use Queueable, InteractsWithQueue, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(public readonly int $appointmentId) {}

    public function handle(GoogleOauthClient $google): void
    {
        if (! $google->isConfigured()) {
            return;
        }

        $appt = Appointment::query()
            ->withoutGlobalScopes()
            ->with(['service', 'client', 'tenant'])
            ->find($this->appointmentId);
        if (! $appt) {
            return;
        }

        $barber = Barber::query()
            ->withoutGlobalScopes()
            ->find($appt->barber_id);
        if (! $barber || ! $barber->user_id) {
            return;
        }

        $conn = CalendarConnection::query()
            ->withoutGlobalScopes()
            ->where('user_id', $barber->user_id)
            ->where('provider', 'google')
            ->where('is_active', true)
            ->first();
        if (! $conn) {
            return;
        }

        $accessToken = $this->ensureFreshAccessToken($conn, $google);
        if (! $accessToken) {
            return;
        }

        $existing = DB::table('calendar_external_events')
            ->where('appointment_id', $appt->id)
            ->where('calendar_connection_id', $conn->id)
            ->first();

        // Cita cancelada → borrar evento si existe en Google.
        if ($appt->status === AppointmentStatus::Cancelled) {
            if ($existing) {
                try {
                    $google->deleteEvent($accessToken, $existing->external_id);
                } catch (\Throwable $e) {
                    Log::warning('Google delete fail', ['err' => $e->getMessage()]);
                }
                DB::table('calendar_external_events')->where('id', $existing->id)->delete();
            }
            return;
        }

        try {
            $tz = $appt->tenant?->timezone ?? 'UTC';
            $externalId = $google->upsertEvent(
                accessToken: $accessToken,
                event: [
                    'summary'     => sprintf(
                        '%s · %s',
                        $appt->service?->name ?? 'Cita',
                        $appt->client?->name ?? 'Cliente',
                    ),
                    'description' => "Reservada vía LUMIA · estado {$appt->status->value}",
                    'start'       => $appt->starts_at->setTimezone($tz)->toIso8601String(),
                    'end'         => $appt->ends_at->setTimezone($tz)->toIso8601String(),
                    'timezone'    => $tz,
                ],
                externalId: $existing?->external_id,
            );

            if ($existing) {
                DB::table('calendar_external_events')
                    ->where('id', $existing->id)
                    ->update(['synced_at' => now(), 'external_id' => $externalId]);
            } else {
                DB::table('calendar_external_events')->insert([
                    'tenant_id'              => $appt->tenant_id,
                    'appointment_id'         => $appt->id,
                    'calendar_connection_id' => $conn->id,
                    'external_id'            => $externalId,
                    'synced_at'              => now(),
                ]);
            }
            $conn->forceFill(['last_synced_at' => now()])->saveQuietly();
        } catch (\Throwable $e) {
            Log::warning('Google upsert fail', [
                'appt' => $appt->id,
                'err'  => $e->getMessage(),
            ]);
            throw $e; // que el queue retry actúe
        }
    }

    /** Refresca el access_token si está vencido. Devuelve uno utilizable o null. */
    private function ensureFreshAccessToken(CalendarConnection $conn, GoogleOauthClient $google): ?string
    {
        $expiresAt = $conn->access_token_expires_at;
        if ($expiresAt && $expiresAt->isFuture()) {
            return $conn->access_token;
        }
        if (! $conn->refresh_token) {
            $conn->forceFill(['is_active' => false])->save();
            return null;
        }

        try {
            $tokens = $google->refreshToken($conn->refresh_token);
            $conn->forceFill([
                'access_token'            => $tokens['access_token'],
                'access_token_expires_at' => now()->addSeconds((int) ($tokens['expires_in'] ?? 3600)),
            ])->save();
            return $tokens['access_token'];
        } catch (\Throwable $e) {
            $conn->forceFill(['is_active' => false])->save();
            Log::warning('Google refresh failed — connection deactivated', ['err' => $e->getMessage()]);
            return null;
        }
    }
}

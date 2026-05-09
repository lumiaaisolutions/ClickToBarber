<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Services;

use App\Domain\Notifications\Contracts\VoiceClient;
use App\Domain\Notifications\Models\NotificationLog;
use App\Infrastructure\CircuitBreaker\CircuitBreaker;
use App\Infrastructure\CircuitBreaker\CircuitOpenException;
use Illuminate\Support\Facades\Log;

final class PlaceVoiceCall
{
    public function __construct(
        private CircuitBreaker $breaker,
        private VoiceClient $client,
    ) {}

    public function execute(
        string $tenantId,
        string $to,
        string $say,
        ?int $userId = null,
        ?int $appointmentId = null,
    ): NotificationLog {
        $log = NotificationLog::create([
            'tenant_id'      => $tenantId,
            'user_id'        => $userId,
            'appointment_id' => $appointmentId,
            'channel'        => 'voice',
            'template'       => 'voice_say',
            'to_address'     => $to,
            'status'         => 'queued',
            'payload'        => json_encode(['say' => $say], JSON_UNESCAPED_UNICODE),
        ]);

        try {
            $result = $this->breaker->call(
                integration: 'twilio_voice',
                scope: $tenantId,
                operation: fn () => $this->client->call($to, $say),
            );
            $log->update([
                'status'   => 'sent',
                'response' => json_encode($result, JSON_UNESCAPED_UNICODE),
                'sent_at'  => now(),
            ]);
        } catch (CircuitOpenException $e) {
            $log->update(['status' => 'deferred', 'response' => $e->getMessage()]);
            Log::warning('Voice call diferida por circuito abierto');
        } catch (\Throwable $e) {
            $log->update(['status' => 'failed', 'response' => $e->getMessage()]);
            Log::error('Voice call falló', ['error' => $e->getMessage()]);
        }

        return $log->fresh();
    }
}

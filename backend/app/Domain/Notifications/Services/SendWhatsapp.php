<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Services;

use App\Domain\Notifications\Contracts\WhatsappClient;
use App\Domain\Notifications\Models\NotificationLog;
use App\Infrastructure\CircuitBreaker\CircuitBreaker;
use App\Infrastructure\CircuitBreaker\CircuitOpenException;
use Illuminate\Support\Facades\Log;

final class SendWhatsapp
{
    public function __construct(
        private CircuitBreaker $breaker,
        private WhatsappClient $client,
    ) {}

    /**
     * @param  array<string,mixed>  $params
     */
    public function execute(
        string $tenantId,
        string $to,
        string $template,
        array $params = [],
        ?int $userId = null,
        ?int $appointmentId = null,
    ): NotificationLog {
        $log = NotificationLog::create([
            'tenant_id'      => $tenantId,
            'user_id'        => $userId,
            'appointment_id' => $appointmentId,
            'channel'        => 'whatsapp',
            'template'       => $template,
            'to_address'     => $to,
            'status'         => 'queued',
            'payload'        => json_encode($params, JSON_UNESCAPED_UNICODE),
        ]);

        try {
            $result = $this->breaker->call(
                integration: 'whatsapp',
                scope: $tenantId,
                operation: fn () => $this->client->send($to, $template, $params),
            );

            $log->update([
                'status'   => 'sent',
                'response' => json_encode($result, JSON_UNESCAPED_UNICODE),
                'sent_at'  => now(),
            ]);
        } catch (CircuitOpenException $e) {
            $log->update(['status' => 'deferred', 'response' => $e->getMessage()]);
            Log::warning('WhatsApp diferido por circuito abierto', ['template' => $template]);
        } catch (\Throwable $e) {
            $log->update(['status' => 'failed', 'response' => $e->getMessage()]);
            Log::error('WhatsApp falló', ['template' => $template, 'error' => $e->getMessage()]);
        }

        return $log->fresh();
    }
}

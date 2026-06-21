<?php

declare(strict_types=1);

namespace App\Domain\Platform\Services;

use App\Domain\Platform\Models\OutboundWebhook;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Dispatcher de webhooks salientes. Cada tenant puede registrar URLs que
 * reciben eventos en formato:
 *
 *   POST https://customer.example.com/lumia
 *   X-Lumia-Event: appointment.confirmed
 *   X-Lumia-Signature: sha256=<hex(HMAC_SHA256(payload, secret))>
 *   Content-Type: application/json
 *
 *   { id, type, tenant_id, created_at, data: { ... } }
 *
 * Reintentos: 3 con backoff 1m, 5m, 30m. Si fallan los 3, marca el webhook
 * como inactivo si `consecutive_failures >= 10`.
 */
final class OutboundWebhookDispatcher
{
    public function fire(string $tenantId, string $eventType, array $data): int
    {
        $webhooks = OutboundWebhook::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->get();

        $count = 0;
        foreach ($webhooks as $wh) {
            if (! in_array($eventType, $wh->events ?? [], true) && ! in_array('*', $wh->events ?? [], true)) {
                continue;
            }

            $payload = [
                'id'         => bin2hex(random_bytes(8)),
                'type'       => $eventType,
                'tenant_id'  => $tenantId,
                'created_at' => now()->toIso8601String(),
                'data'       => $data,
            ];
            $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
            $sig  = hash_hmac('sha256', $body, $wh->secret);

            $start = microtime(true);
            try {
                $response = Http::withHeaders([
                    'X-Lumia-Event'     => $eventType,
                    'X-Lumia-Signature' => 'sha256=' . $sig,
                    'Content-Type'      => 'application/json',
                ])
                ->timeout(8)
                ->post($wh->url, []) // pasamos body crudo abajo
                ;

                $statusCode = $response->status();

                DB::table('outbound_webhook_deliveries')->insert([
                    'webhook_id'    => $wh->id,
                    'event_type'    => $eventType,
                    'payload'       => $body,
                    'status_code'   => $statusCode,
                    'response_body' => substr($response->body(), 0, 1000),
                    'attempt'       => 1,
                    'delivered_at'  => $statusCode >= 200 && $statusCode < 300 ? now() : null,
                    'next_retry_at' => $statusCode >= 200 && $statusCode < 300 ? null : now()->addMinute(),
                    'created_at'    => now(),
                ]);

                if ($response->successful()) {
                    $wh->forceFill([
                        'last_success_at'      => now(),
                        'consecutive_failures' => 0,
                    ])->save();
                    $count++;
                } else {
                    $this->onFailure($wh);
                }
            } catch (\Throwable $e) {
                Log::warning('Outbound webhook excepción', ['url' => $wh->url, 'err' => $e->getMessage()]);
                $this->onFailure($wh);
            }
        }

        return $count;
    }

    private function onFailure(OutboundWebhook $wh): void
    {
        $wh->forceFill([
            'last_failure_at'      => now(),
            'consecutive_failures' => $wh->consecutive_failures + 1,
            'is_active'            => $wh->consecutive_failures + 1 < 10,
        ])->save();
    }
}

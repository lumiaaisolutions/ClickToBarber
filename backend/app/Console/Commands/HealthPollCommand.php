<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Hace ping a /api/up/deep y notifica a Slack si hay 3 fallos consecutivos.
 *
 *   php artisan lumia:health-poll
 *
 * Configurar en cron cada minuto. Usa Cache para mantener el contador de
 * fallos consecutivos. Resetea contador al primer éxito.
 *
 * env:
 *   APP_HEALTH_URL=http://127.0.0.1:8000/api/up/deep
 *   SLACK_HEALTH_WEBHOOK=https://hooks.slack.com/services/...
 */
final class HealthPollCommand extends Command
{
    protected $signature = 'lumia:health-poll {--threshold=3}';
    protected $description = 'Ping a /up/deep y alerta Slack si N fallos consecutivos';

    private const CACHE_KEY = 'lumia:health:consecutive_failures';
    private const ALERTED_KEY = 'lumia:health:alerted_at';

    public function handle(): int
    {
        $url = (string) env('APP_HEALTH_URL', 'http://127.0.0.1:8000/api/up/deep');
        $threshold = max(1, (int) $this->option('threshold'));

        $ok = false;
        try {
            $response = Http::timeout(5)->get($url);
            $ok = $response->successful();
            if ($ok) {
                $body = $response->json();
                if (is_array($body) && isset($body['status']) && $body['status'] !== 'ok') {
                    $ok = false;
                }
            }
        } catch (\Throwable $e) {
            $this->warn("ping failed: {$e->getMessage()}");
        }

        if ($ok) {
            $had = (int) Cache::get(self::CACHE_KEY, 0);
            Cache::forget(self::CACHE_KEY);
            if ($had >= $threshold && Cache::has(self::ALERTED_KEY)) {
                $this->postSlack(":white_check_mark: LUMIA /up/deep recuperado tras {$had} fallos.");
                Cache::forget(self::ALERTED_KEY);
            }
            $this->info('OK');
            return self::SUCCESS;
        }

        $count = (int) Cache::get(self::CACHE_KEY, 0) + 1;
        Cache::put(self::CACHE_KEY, $count, now()->addHour());

        if ($count === $threshold && ! Cache::has(self::ALERTED_KEY)) {
            $this->postSlack(":rotating_light: LUMIA /up/deep falló {$count} veces seguidas. Revisa <{$url}>.");
            Cache::put(self::ALERTED_KEY, now()->toIso8601String(), now()->addHour());
        }

        $this->error("FAIL ({$count}/{$threshold})");
        return self::FAILURE;
    }

    private function postSlack(string $text): void
    {
        $webhook = (string) env('SLACK_HEALTH_WEBHOOK', '');
        if ($webhook === '') {
            $this->warn('SLACK_HEALTH_WEBHOOK no configurado — alerta omitida');
            return;
        }
        try {
            Http::timeout(5)->post($webhook, ['text' => $text]);
        } catch (\Throwable $e) {
            $this->warn("Slack post failed: {$e->getMessage()}");
        }
    }
}

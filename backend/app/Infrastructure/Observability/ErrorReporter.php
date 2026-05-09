<?php

declare(strict_types=1);

namespace App\Infrastructure\Observability;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Reportador de excepciones a Sentry-compatible (Sentry Cloud, GlitchTip, self-hosted).
 *
 * Sin SDK Laravel — usa el endpoint store/ del protocolo Sentry directamente.
 * Si SENTRY_DSN está vacío, es no-op (queda solo el log estándar de Laravel).
 *
 * Configuración: SENTRY_DSN, SENTRY_RELEASE, SENTRY_ENVIRONMENT.
 */
final class ErrorReporter
{
    public function capture(Throwable $e, array $context = []): ?string
    {
        $dsn = (string) config('observability.sentry_dsn', env('SENTRY_DSN', ''));
        if ($dsn === '') {
            return null;
        }

        $parsed = $this->parseDsn($dsn);
        if (! $parsed) {
            Log::warning('SENTRY_DSN inválido', ['dsn_prefix' => substr($dsn, 0, 8)]);
            return null;
        }

        $eventId = bin2hex(random_bytes(16));

        $payload = [
            'event_id'    => $eventId,
            'timestamp'   => gmdate('Y-m-d\TH:i:s\Z'),
            'platform'    => 'php',
            'level'       => 'error',
            'environment' => env('SENTRY_ENVIRONMENT', env('APP_ENV', 'local')),
            'release'     => env('SENTRY_RELEASE', 'dev'),
            'server_name' => gethostname() ?: 'unknown',
            'logger'      => 'app.errors',
            'message'     => substr($e->getMessage(), 0, 500),
            'tags'        => array_merge([
                'app' => 'lumia-backend',
                'php' => PHP_VERSION,
            ], $context['tags'] ?? []),
            'user'        => $context['user'] ?? null,
            'extra'       => $context['extra'] ?? [],
            'exception'   => [
                'values' => [[
                    'type'   => get_class($e),
                    'value'  => $e->getMessage(),
                    'stacktrace' => $this->buildStacktrace($e),
                ]],
            ],
        ];

        try {
            // Ingest endpoint: <protocol>://<host>/api/<project>/store/
            $url = sprintf(
                '%s://%s/api/%s/store/',
                $parsed['scheme'],
                $parsed['host'] . (isset($parsed['port']) ? ":{$parsed['port']}" : ''),
                $parsed['project'],
            );

            // X-Sentry-Auth header
            $auth = sprintf(
                'Sentry sentry_version=7, sentry_client=lumia-php/1.0, sentry_timestamp=%d, sentry_key=%s',
                time(),
                $parsed['public_key'],
            );

            Http::timeout(3)
                ->withHeaders([
                    'X-Sentry-Auth' => $auth,
                    'Content-Type'  => 'application/json',
                ])
                ->post($url, $payload);
        } catch (Throwable $reportingError) {
            Log::warning('No se pudo enviar evento a Sentry', [
                'error' => $reportingError->getMessage(),
            ]);
        }

        return $eventId;
    }

    /** @return array{scheme:string,host:string,port?:int,public_key:string,project:string}|null */
    private function parseDsn(string $dsn): ?array
    {
        $url = parse_url($dsn);
        if (! $url || empty($url['host']) || empty($url['user']) || empty($url['path'])) {
            return null;
        }

        $project = ltrim($url['path'], '/');
        if (! ctype_digit($project)) {
            return null;
        }

        return [
            'scheme'     => $url['scheme'] ?? 'https',
            'host'       => $url['host'],
            'port'       => $url['port'] ?? null,
            'public_key' => $url['user'],
            'project'    => $project,
        ];
    }

    private function buildStacktrace(Throwable $e): array
    {
        $frames = [];
        foreach (array_reverse($e->getTrace()) as $frame) {
            $frames[] = [
                'filename' => $frame['file'] ?? '[internal]',
                'lineno'   => $frame['line'] ?? 0,
                'function' => ($frame['class'] ?? '') . ($frame['type'] ?? '') . ($frame['function'] ?? ''),
            ];
        }

        return ['frames' => $frames];
    }
}

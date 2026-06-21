<?php

declare(strict_types=1);

namespace App\Infrastructure\Integrations\Google;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Cliente OAuth 2.0 mínimo para Google Calendar.
 *
 * Sin SDK Google — usa los endpoints REST estándar:
 *   - https://accounts.google.com/o/oauth2/v2/auth (redirect)
 *   - https://oauth2.googleapis.com/token (intercambio code → tokens)
 *   - https://www.googleapis.com/calendar/v3/calendars/primary/events (push)
 *
 * Configuración: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET en .env.
 * El redirect_uri se construye desde APP_URL + /api/admin/calendar/google/callback.
 */
final class GoogleOauthClient
{
    private const SCOPE = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email';

    public function authorizationUrl(string $state): string
    {
        $params = http_build_query([
            'client_id'     => $this->clientId(),
            'redirect_uri'  => $this->redirectUri(),
            'response_type' => 'code',
            'scope'         => self::SCOPE,
            'access_type'   => 'offline',
            'prompt'        => 'consent',
            'state'         => $state,
        ]);

        return 'https://accounts.google.com/o/oauth2/v2/auth?' . $params;
    }

    /**
     * Intercambia el `code` recibido en el callback por access_token + refresh_token.
     *
     * @return array{access_token:string, refresh_token:?string, expires_in:int, scope:string, token_type:string, id_token?:string}
     */
    public function exchangeCode(string $code): array
    {
        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'code'          => $code,
            'client_id'     => $this->clientId(),
            'client_secret' => $this->clientSecret(),
            'redirect_uri'  => $this->redirectUri(),
            'grant_type'    => 'authorization_code',
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Google token exchange failed: ' . $response->body());
        }

        return $response->json();
    }

    /** @return array{access_token:string, expires_in:int, scope?:string} */
    public function refreshToken(string $refreshToken): array
    {
        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id'     => $this->clientId(),
            'client_secret' => $this->clientSecret(),
            'refresh_token' => $refreshToken,
            'grant_type'    => 'refresh_token',
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Google token refresh failed: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Crea/actualiza un evento en el calendario "primary" del usuario.
     * Devuelve el `id` del evento (string).
     *
     * @param array{summary:string, description?:string, start:string, end:string, timezone:string} $event
     */
    public function upsertEvent(string $accessToken, array $event, ?string $externalId = null): string
    {
        $body = [
            'summary'     => $event['summary'],
            'description' => $event['description'] ?? null,
            'start'       => ['dateTime' => $event['start'], 'timeZone' => $event['timezone']],
            'end'         => ['dateTime' => $event['end'],   'timeZone' => $event['timezone']],
            'reminders'   => ['useDefault' => true],
        ];

        $url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
        if ($externalId) {
            $response = Http::withToken($accessToken)
                ->acceptJson()
                ->put($url . '/' . urlencode($externalId), $body);
        } else {
            $response = Http::withToken($accessToken)
                ->acceptJson()
                ->post($url, $body);
        }

        if ($response->failed()) {
            throw new RuntimeException('Google upsert event failed: ' . $response->status() . ' ' . substr($response->body(), 0, 300));
        }

        return (string) $response->json('id');
    }

    public function deleteEvent(string $accessToken, string $externalId): void
    {
        Http::withToken($accessToken)
            ->delete('https://www.googleapis.com/calendar/v3/calendars/primary/events/' . urlencode($externalId));
    }

    private function clientId(): string
    {
        return (string) env('GOOGLE_CLIENT_ID', '');
    }

    private function clientSecret(): string
    {
        return (string) env('GOOGLE_CLIENT_SECRET', '');
    }

    private function redirectUri(): string
    {
        return rtrim((string) env('APP_URL', 'http://localhost:8000'), '/') . '/api/admin/calendar/google/callback';
    }

    public function isConfigured(): bool
    {
        return $this->clientId() !== '' && $this->clientSecret() !== '';
    }
}

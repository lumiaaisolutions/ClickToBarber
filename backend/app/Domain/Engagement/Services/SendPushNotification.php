<?php

declare(strict_types=1);

namespace App\Domain\Engagement\Services;

use App\Domain\Engagement\Models\PushSubscription;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Envía una notificación Web Push real a las suscripciones del user.
 *
 * - Si VAPID no está configurado, loguea y retorna 0 envíos.
 * - Si el endpoint responde 410 Gone, borra la subscription (browser
 *   la descartó).
 *
 * @see WebPushSigner, WebPushPayloadEncrypter
 */
final class SendPushNotification
{
    public function __construct(
        private WebPushSigner $signer,
        private WebPushPayloadEncrypter $encrypter,
    ) {}

    /**
     * @param array{title:string, body:string, url?:string, tag?:string, icon?:string} $message
     * @return int número de subscriptions notificadas
     */
    public function toUser(int $userId, array $message): int
    {
        $subs = PushSubscription::query()->where('user_id', $userId)->get();

        return $this->dispatch($subs, $message);
    }

    /**
     * @param iterable<PushSubscription> $subs
     * @param array<string,mixed>        $message
     */
    public function dispatch(iterable $subs, array $message): int
    {
        if (! $this->signer->isConfigured()) {
            Log::info('[Push] VAPID no configurado — no-op', ['payload' => $message]);
            return 0;
        }

        $payload = json_encode($message, JSON_UNESCAPED_UNICODE);
        $sent = 0;

        foreach ($subs as $sub) {
            try {
                $enc = $this->encrypter->encrypt($payload, $sub->p256dh_key, $sub->auth_key);
                $headers = array_merge($enc['headers'], [
                    'Authorization' => $this->signer->buildAuthHeader($sub->endpoint),
                ]);

                $response = Http::withHeaders($headers)
                    ->withBody($enc['body'], $enc['headers']['Content-Type'])
                    ->timeout(10)
                    ->post($sub->endpoint);

                if ($response->status() === 410 || $response->status() === 404) {
                    $sub->delete(); // browser la descartó
                    continue;
                }

                if ($response->failed()) {
                    Log::warning('[Push] envío falló', [
                        'sub'    => $sub->id,
                        'status' => $response->status(),
                        'body'   => substr($response->body(), 0, 200),
                    ]);
                    continue;
                }

                $sub->forceFill(['last_used_at' => now()])->saveQuietly();
                $sent++;
            } catch (\Throwable $e) {
                Log::warning('[Push] excepción', ['sub' => $sub->id, 'err' => $e->getMessage()]);
            }
        }

        return $sent;
    }
}

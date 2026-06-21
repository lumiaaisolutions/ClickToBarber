<?php

declare(strict_types=1);

namespace App\Http\Common\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Valida la firma HMAC de webhooks entrantes según el proveedor.
 *
 * Uso: ->middleware('webhook:stripe' | 'webhook:meta' | 'webhook:twilio')
 *
 * Cada proveedor tiene un esquema distinto:
 *  - Stripe: cabecera "Stripe-Signature" con t=... v1=hex(HMAC_SHA256(t.payload, secret))
 *  - Meta:   cabecera "X-Hub-Signature-256" con "sha256=" + hex(HMAC_SHA256(payload, secret))
 *  - Twilio: cabecera "X-Twilio-Signature" con base64(HMAC_SHA1(URL+sortedFormParams, secret))
 *
 * El secreto vive en config/security.php → webhooks.{provider}.secret.
 * Si el secret está vacío y APP_ENV != production, el middleware deja pasar
 * (modo dev sin credenciales). En producción siempre rechaza con 401.
 */
final class VerifyWebhookSignature
{
    public function handle(Request $request, Closure $next, string $provider = 'stripe'): Response
    {
        $secret = (string) config("security.webhooks.{$provider}.secret", '');

        if ($secret === '') {
            if (app()->isProduction()) {
                return $this->reject('webhook_secret_missing', 503);
            }
            // Sin secret en dev → seguir, registrar advertencia.
            logger()->warning("Webhook {$provider} sin secret configurado — pasando en modo dev");

            return $next($request);
        }

        $valid = match ($provider) {
            'stripe' => $this->verifyStripe($request, $secret),
            'meta'   => $this->verifyMeta($request, $secret),
            'twilio' => $this->verifyTwilio($request, $secret),
            default  => false,
        };

        if (! $valid) {
            return $this->reject("invalid_{$provider}_signature");
        }

        return $next($request);
    }

    private function verifyStripe(Request $request, string $secret): bool
    {
        $header = $request->header('Stripe-Signature', '');
        if (! is_string($header) || $header === '') {
            return false;
        }

        $parts = [];
        foreach (explode(',', $header) as $piece) {
            [$k, $v] = array_pad(explode('=', trim($piece), 2), 2, '');
            $parts[$k][] = $v;
        }

        $timestamp = $parts['t'][0] ?? '';
        $signatures = $parts['v1'] ?? [];

        if ($timestamp === '' || $signatures === []) {
            return false;
        }

        // Tolerancia de 5 minutos contra replay
        if (abs(time() - (int) $timestamp) > 300) {
            return false;
        }

        $expected = hash_hmac('sha256', $timestamp . '.' . $request->getContent(), $secret);
        foreach ($signatures as $sig) {
            if (hash_equals($expected, $sig)) {
                return true;
            }
        }

        return false;
    }

    private function verifyMeta(Request $request, string $secret): bool
    {
        $header = (string) $request->header('X-Hub-Signature-256', '');
        if ($header === '' || ! str_starts_with($header, 'sha256=')) {
            return false;
        }

        $signature = substr($header, 7);
        $expected  = hash_hmac('sha256', $request->getContent(), $secret);

        return hash_equals($expected, $signature);
    }

    private function verifyTwilio(Request $request, string $secret): bool
    {
        $signature = (string) $request->header('X-Twilio-Signature', '');
        if ($signature === '') {
            return false;
        }

        $url = $request->fullUrl();
        $params = $request->post();
        ksort($params);
        $data = $url;
        foreach ($params as $k => $v) {
            $data .= $k . (is_string($v) ? $v : json_encode($v));
        }

        $expected = base64_encode(hash_hmac('sha1', $data, $secret, true));

        return hash_equals($expected, $signature);
    }

    private function reject(string $code, int $status = 401): Response
    {
        return response()->json(['error' => $code], $status);
    }
}

<?php

declare(strict_types=1);

namespace App\Domain\Engagement\Services;

use RuntimeException;

/**
 * Firma JWT VAPID (ES256) y construye headers Authorization para Web Push.
 *
 * Implementación pura PHP usando `openssl_sign()` con SHA256 sobre la
 * curva P-256. Las claves VAPID deben generarse una vez y persistir en
 * `VAPID_PUBLIC_KEY` (base64url) y `VAPID_PRIVATE_KEY` (PEM).
 *
 * Para generarlas:
 *   php artisan lumia:generate-vapid
 */
final class WebPushSigner
{
    public function isConfigured(): bool
    {
        return (string) env('VAPID_PUBLIC_KEY', '') !== ''
            && (string) env('VAPID_PRIVATE_KEY', '') !== '';
    }

    public function publicKeyBase64Url(): string
    {
        return (string) env('VAPID_PUBLIC_KEY', '');
    }

    /**
     * Firma un JWT ES256 con audience = origin del endpoint del browser.
     * exp: now + 12h. sub: mailto contacto.
     */
    public function buildAuthHeader(string $endpoint): string
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no están configurados.');
        }

        $parts = parse_url($endpoint);
        $audience = ($parts['scheme'] ?? 'https') . '://' . ($parts['host'] ?? '');

        $payload = [
            'aud' => $audience,
            'exp' => time() + 43200,
            'sub' => 'mailto:' . (string) env('VAPID_SUBJECT', 'admin@lumia.app'),
        ];

        $jwt = $this->signJwt($payload);

        return sprintf(
            'vapid t=%s, k=%s',
            $jwt,
            $this->publicKeyBase64Url(),
        );
    }

    private function signJwt(array $payload): string
    {
        $header = ['typ' => 'JWT', 'alg' => 'ES256'];
        $segments = [
            $this->b64url(json_encode($header)),
            $this->b64url(json_encode($payload)),
        ];

        $signingInput = implode('.', $segments);
        $signature = '';
        $privateKey = openssl_pkey_get_private((string) env('VAPID_PRIVATE_KEY'));
        if (! $privateKey) {
            throw new RuntimeException('VAPID_PRIVATE_KEY inválida (debe ser PEM EC P-256).');
        }

        if (! openssl_sign($signingInput, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('No se pudo firmar JWT VAPID.');
        }

        // Convertir DER → r||s (formato JOSE) — 64 bytes total.
        $signature = $this->derToJose($signature);
        $segments[] = $this->b64url($signature);

        return implode('.', $segments);
    }

    private function derToJose(string $der): string
    {
        // Parser DER mínimo del SEQUENCE { INTEGER r, INTEGER s }.
        $pos = 0;
        if (ord($der[$pos++]) !== 0x30) {
            throw new RuntimeException('DER signature inválido.');
        }
        $len = ord($der[$pos++]);
        if ($len & 0x80) {
            $pos += $len & 0x7F;
        }

        $r = $this->parseDerInteger($der, $pos);
        $s = $this->parseDerInteger($der, $pos);

        // Pad a 32 bytes cada uno.
        $r = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
        $s = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);

        return $r . $s;
    }

    private function parseDerInteger(string $der, int &$pos): string
    {
        if (ord($der[$pos++]) !== 0x02) {
            throw new RuntimeException('Esperaba INTEGER en DER.');
        }
        $len = ord($der[$pos++]);
        $value = substr($der, $pos, $len);
        $pos += $len;

        return $value;
    }

    public function b64url(string $bin): string
    {
        return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
    }

    public function b64urlDecode(string $s): string
    {
        $s = strtr($s, '-_', '+/');
        $pad = strlen($s) % 4;
        if ($pad) {
            $s .= str_repeat('=', 4 - $pad);
        }
        return (string) base64_decode($s);
    }
}

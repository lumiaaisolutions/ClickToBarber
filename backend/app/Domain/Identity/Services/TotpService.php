<?php

declare(strict_types=1);

namespace App\Domain\Identity\Services;

/**
 * TOTP RFC 6238 puro PHP — sin dependencias externas.
 *
 * Genera secrets base32, OTPs de 6 dígitos con SHA1 de 30s, y URI otpauth://
 * para Google Authenticator / Authy / 1Password.
 */
final class TotpService
{
    private const PERIOD = 30;
    private const DIGITS = 6;
    private const WINDOW = 1; // ±1 paso para tolerar drift de reloj

    /** Genera un secret de 20 bytes en base32 (160 bits, recomendado RFC 4226). */
    public function generateSecret(): string
    {
        return $this->base32Encode(random_bytes(20));
    }

    /** URI otpauth:// para mostrar como QR. */
    public function provisioningUri(string $secret, string $accountName, string $issuer): string
    {
        $params = http_build_query([
            'secret' => $secret,
            'issuer' => $issuer,
            'algorithm' => 'SHA1',
            'digits' => self::DIGITS,
            'period' => self::PERIOD,
        ]);

        return sprintf(
            'otpauth://totp/%s:%s?%s',
            rawurlencode($issuer),
            rawurlencode($accountName),
            $params,
        );
    }

    /** Verifica un código contra el secret, con tolerancia ±1 paso. */
    public function verify(string $secret, string $code): bool
    {
        $code = preg_replace('/\s+/', '', $code) ?? '';
        if (! ctype_digit($code) || strlen($code) !== self::DIGITS) {
            return false;
        }

        $now = (int) floor(time() / self::PERIOD);
        for ($offset = -self::WINDOW; $offset <= self::WINDOW; $offset++) {
            if (hash_equals($this->computeOtp($secret, $now + $offset), $code)) {
                return true;
            }
        }

        return false;
    }

    /** Genera N códigos de recuperación (8 por defecto), formato xxxx-xxxx. */
    public function generateRecoveryCodes(int $count = 8): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $codes[] = sprintf(
                '%s-%s',
                bin2hex(random_bytes(2)),
                bin2hex(random_bytes(2)),
            );
        }

        return $codes;
    }

    private function computeOtp(string $secret, int $counter): string
    {
        $bin = $this->base32Decode($secret);
        if ($bin === '') {
            return str_repeat('0', self::DIGITS);
        }

        $msg = pack('J', $counter); // 8 bytes big-endian
        $hash = hash_hmac('sha1', $msg, $bin, true);

        $offset = ord(substr($hash, -1)) & 0xF;
        $part = substr($hash, $offset, 4);
        $value = unpack('N', $part)[1] & 0x7FFFFFFF;
        $code = (string) ($value % (10 ** self::DIGITS));

        return str_pad($code, self::DIGITS, '0', STR_PAD_LEFT);
    }

    private function base32Encode(string $data): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $bits = '';
        for ($i = 0; $i < strlen($data); $i++) {
            $bits .= str_pad(decbin(ord($data[$i])), 8, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $chunk = str_pad($chunk, 5, '0');
            $out .= $alphabet[bindec($chunk)];
        }

        return $out;
    }

    private function base32Decode(string $b32): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $b32 = strtoupper(preg_replace('/[^A-Z2-7]/', '', $b32) ?? '');
        $bits = '';
        for ($i = 0; $i < strlen($b32); $i++) {
            $idx = strpos($alphabet, $b32[$i]);
            if ($idx === false) {
                continue;
            }
            $bits .= str_pad(decbin($idx), 5, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 8) as $chunk) {
            if (strlen($chunk) === 8) {
                $out .= chr(bindec($chunk));
            }
        }

        return $out;
    }
}

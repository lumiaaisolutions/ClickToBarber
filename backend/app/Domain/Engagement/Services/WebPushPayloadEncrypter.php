<?php

declare(strict_types=1);

namespace App\Domain\Engagement\Services;

use RuntimeException;

/**
 * Cifra el payload de Web Push según RFC 8291 (aes128gcm).
 *
 * Pasos:
 *  1) Genera un keypair ephemeral P-256.
 *  2) ECDH con la pubkey del browser (`p256dh`) → shared secret.
 *  3) HKDF-SHA256 con info "Content-Encoding: auth\x00" + browser auth →
 *     key encryption key.
 *  4) HKDF de nuevo con info "Content-Encoding: aes128gcm\x00" → CEK.
 *  5) AES-128-GCM cifra payload con nonce derivado vía HKDF "nonce\x00".
 *  6) Devuelve el bloque binario salt(16) | rs(4=4096) | id_len(1) |
 *     pub_key_ephemeral(65) | ciphertext+tag.
 *
 * NOTA: requiere `openssl` con curva prime256v1 y `aes-128-gcm`.
 */
final class WebPushPayloadEncrypter
{
    public function __construct(private WebPushSigner $signer) {}

    /**
     * @return array{body:string, headers:array<string,string>}
     */
    public function encrypt(string $payload, string $p256dhB64Url, string $authB64Url): array
    {
        if ($payload === '') {
            return ['body' => '', 'headers' => []];
        }

        // 1) ephemeral keypair
        $ephemeral = openssl_pkey_new([
            'curve_name'       => 'prime256v1',
            'private_key_type' => OPENSSL_KEYTYPE_EC,
        ]);
        if (! $ephemeral) {
            throw new RuntimeException('No se pudo generar ephemeral key P-256.');
        }
        $ephDetails = openssl_pkey_get_details($ephemeral);
        $ephPub = "\x04" . $ephDetails['ec']['x'] . $ephDetails['ec']['y']; // uncompressed 65 bytes

        // 2) ECDH shared secret
        $clientPubBin = $this->signer->b64urlDecode($p256dhB64Url);
        $authBin      = $this->signer->b64urlDecode($authB64Url);
        $shared = $this->ecdh($ephemeral, $clientPubBin);

        // 3+4) HKDF derivation chain
        $salt = random_bytes(16);

        $prkKey = $this->hkdf($authBin, $shared, "WebPush: info\x00" . $clientPubBin . $ephPub, 32);
        $cek    = $this->hkdf($salt, $prkKey, "Content-Encoding: aes128gcm\x00", 16);
        $nonce  = $this->hkdf($salt, $prkKey, "Content-Encoding: nonce\x00", 12);

        // 5) AES-128-GCM
        $padded = $payload . "\x02"; // delimiter
        $tag = '';
        $ciphertext = openssl_encrypt(
            $padded,
            'aes-128-gcm',
            $cek,
            OPENSSL_RAW_DATA,
            $nonce,
            $tag,
            '',
            16,
        );
        if ($ciphertext === false) {
            throw new RuntimeException('AES-128-GCM falló.');
        }

        // 6) RFC 8291 framing
        $body  = $salt;
        $body .= pack('N', 4096);          // record size
        $body .= chr(strlen($ephPub));      // id length
        $body .= $ephPub;
        $body .= $ciphertext . $tag;

        return [
            'body' => $body,
            'headers' => [
                'Content-Encoding' => 'aes128gcm',
                'Content-Type'     => 'application/octet-stream',
                'Content-Length'   => (string) strlen($body),
                'TTL'              => '86400',
            ],
        ];
    }

    private function ecdh($ephemeralKey, string $clientPubBin): string
    {
        // Construir PEM del client public key uncompressed (65 bytes prefijado 0x04).
        if (strlen($clientPubBin) !== 65 || $clientPubBin[0] !== "\x04") {
            throw new RuntimeException('p256dh inválida (debe ser 65 bytes uncompressed).');
        }
        $x = substr($clientPubBin, 1, 32);
        $y = substr($clientPubBin, 33, 32);

        // Construye un EC public key DER manualmente.
        // SubjectPublicKeyInfo ASN.1 con OID prime256v1.
        $der = $this->buildEcPubKeyDer($x, $y);
        $pem = "-----BEGIN PUBLIC KEY-----\n"
             . chunk_split(base64_encode($der), 64, "\n")
             . "-----END PUBLIC KEY-----\n";

        $clientKey = openssl_pkey_get_public($pem);
        if (! $clientKey) {
            throw new RuntimeException('No se pudo parsear p256dh.');
        }

        // PHP 8.1+: openssl_pkey_derive
        $shared = openssl_pkey_derive($clientKey, $ephemeralKey, 32);
        if ($shared === false) {
            throw new RuntimeException('ECDH falló.');
        }

        return $shared;
    }

    private function buildEcPubKeyDer(string $x, string $y): string
    {
        // Hardcoded DER prefix for ecPublicKey + secp256r1 OID.
        $prefix = hex2bin(
            '3059301306072a8648ce3d020106082a8648ce3d030107034200'
        );
        return $prefix . "\x04" . $x . $y;
    }

    private function hkdf(string $salt, string $ikm, string $info, int $length): string
    {
        return hash_hkdf('sha256', $ikm, $length, $info, $salt);
    }
}

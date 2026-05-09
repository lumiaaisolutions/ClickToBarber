<?php

declare(strict_types=1);

use App\Domain\Engagement\Services\WebPushPayloadEncrypter;
use App\Domain\Engagement\Services\WebPushSigner;

it('cifra payload con keypair P-256 válido', function () {
    $browserKey = @openssl_pkey_new([
        'curve_name' => 'prime256v1',
        'private_key_type' => OPENSSL_KEYTYPE_EC,
    ]);

    if (! $browserKey) {
        $this->markTestSkipped('openssl prime256v1 no disponible en este entorno');
    }

    $details = openssl_pkey_get_details($browserKey);
    $pub = "\x04" . $details['ec']['x'] . $details['ec']['y'];
    $p256dh = rtrim(strtr(base64_encode($pub), '+/', '-_'), '=');
    $auth   = rtrim(strtr(base64_encode(random_bytes(16)), '+/', '-_'), '=');

    $encrypter = app(WebPushPayloadEncrypter::class);
    $result = $encrypter->encrypt('{"title":"hi"}', $p256dh, $auth);

    expect($result)->toHaveKeys(['body', 'headers'])
        ->and($result['body'])->toBeString()
        ->and(strlen($result['body']))->toBeGreaterThan(80)
        ->and($result['headers']['Content-Encoding'])->toBe('aes128gcm');
});

it('VapidSigner detecta correctamente cuando no hay claves', function () {
    expect(app(WebPushSigner::class)->isConfigured())->toBeFalse();
});

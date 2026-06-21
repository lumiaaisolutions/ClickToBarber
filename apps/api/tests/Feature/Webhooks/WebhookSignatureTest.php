<?php

declare(strict_types=1);

/**
 * Verificación de firmas HMAC en webhooks.
 *
 * El middleware `webhook:{provider}` deja pasar sin firma SOLO si APP_ENV
 * != production y el secret está vacío. En CI/local con secret configurado,
 * cualquier firma inválida debe rechazar con 401.
 */

it('rejects stripe webhook with invalid signature when secret is set', function () {
    config(['security.webhooks.stripe.secret' => 'whsec_test_secret']);

    $payload = json_encode([
        'id'   => 'evt_invalid',
        'type' => 'invoice.paid',
        'data' => ['object' => []],
    ]);

    $response = $this->call('POST', '/api/webhooks/stripe', [], [], [], [
        'HTTP_STRIPE_SIGNATURE' => 't=12345,v1=invalidsignature',
        'CONTENT_TYPE'          => 'application/json',
    ], $payload);

    $response->assertStatus(401)
        ->assertJson(['error' => 'invalid_stripe_signature']);
});

it('accepts stripe webhook with valid signature', function () {
    $secret = 'whsec_test_secret';
    config(['security.webhooks.stripe.secret' => $secret]);

    $payload = json_encode([
        'id'   => 'evt_valid_' . uniqid(),
        'type' => 'invoice.paid',
        'data' => ['object' => ['subscription' => 'sub_x']],
    ]);
    $timestamp = (string) time();
    $signedPayload = $timestamp . '.' . $payload;
    $sig = hash_hmac('sha256', $signedPayload, $secret);

    $response = $this->call('POST', '/api/webhooks/stripe', [], [], [], [
        'HTTP_STRIPE_SIGNATURE' => "t={$timestamp},v1={$sig}",
        'CONTENT_TYPE'          => 'application/json',
    ], $payload);

    $response->assertOk();
});

it('rejects meta webhook with invalid signature when secret is set', function () {
    config(['security.webhooks.meta.secret' => 'meta_secret']);

    $payload = json_encode(['entry' => []]);

    $response = $this->call('POST', '/api/webhooks/whatsapp', [], [], [], [
        'HTTP_X_HUB_SIGNATURE_256' => 'sha256=deadbeef',
        'CONTENT_TYPE'             => 'application/json',
    ], $payload);

    $response->assertStatus(401);
});

it('verifies meta webhook GET with verify_token (no HMAC)', function () {
    config(['services.meta_whatsapp.webhook_verify_token' => 'verify123']);

    $response = $this->get('/api/webhooks/whatsapp?hub_mode=subscribe&hub_verify_token=verify123&hub_challenge=ok42');
    $response->assertOk();
    expect($response->getContent())->toBe('ok42');

    $bad = $this->get('/api/webhooks/whatsapp?hub_mode=subscribe&hub_verify_token=wrong&hub_challenge=x');
    $bad->assertStatus(403);
});

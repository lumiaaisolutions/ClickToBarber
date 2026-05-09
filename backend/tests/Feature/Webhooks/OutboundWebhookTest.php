<?php

declare(strict_types=1);

use App\Domain\Platform\Models\OutboundWebhook;
use App\Domain\Platform\Services\OutboundWebhookDispatcher;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->demo = createDemoTenant();
});

it('OutboundWebhookDispatcher envía POST con HMAC firmado', function () {
    $secret = OutboundWebhook::newSecret();

    OutboundWebhook::create([
        'tenant_id' => $this->demo['tenant']->id,
        'url'       => 'https://customer.example.com/lumia',
        'events'    => ['*'],
        'secret'    => $secret,
        'is_active' => true,
    ]);

    Http::fake([
        'customer.example.com/*' => Http::response(['ok' => true], 200),
    ]);

    $count = app(OutboundWebhookDispatcher::class)->fire(
        $this->demo['tenant']->id,
        'appointment.confirmed',
        ['appointment_id' => 42],
    );

    expect($count)->toBe(1);

    Http::assertSent(function ($request) use ($secret) {
        $sig = $request->header('X-Lumia-Signature')[0] ?? '';
        return str_starts_with($sig, 'sha256=')
            && $request->header('X-Lumia-Event')[0] === 'appointment.confirmed';
    });
});

it('marca webhook inactivo después de 10 fallos consecutivos', function () {
    $wh = OutboundWebhook::create([
        'tenant_id' => $this->demo['tenant']->id,
        'url'       => 'https://broken.example.com/lumia',
        'events'    => ['*'],
        'secret'    => OutboundWebhook::newSecret(),
        'is_active' => true,
        'consecutive_failures' => 9,
    ]);

    Http::fake(['broken.example.com/*' => Http::response('error', 500)]);

    app(OutboundWebhookDispatcher::class)->fire(
        $this->demo['tenant']->id, 'appointment.booked', [],
    );

    expect($wh->fresh()->is_active)->toBeFalse()
        ->and($wh->fresh()->consecutive_failures)->toBe(10);
});

it('skipea webhooks cuyo events array no incluye el evento', function () {
    OutboundWebhook::create([
        'tenant_id' => $this->demo['tenant']->id,
        'url'       => 'https://specific.example.com/lumia',
        'events'    => ['appointment.completed'], // sólo este
        'secret'    => OutboundWebhook::newSecret(),
        'is_active' => true,
    ]);

    Http::fake();
    $count = app(OutboundWebhookDispatcher::class)->fire(
        $this->demo['tenant']->id, 'appointment.booked', [],
    );

    expect($count)->toBe(0);
});

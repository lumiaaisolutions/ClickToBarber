<?php

declare(strict_types=1);

namespace App\Infrastructure\Integrations\Stripe;

use App\Domain\Payments\Contracts\PaymentGateway;
use Illuminate\Support\Str;

/**
 * Pasarela mock para entorno local. Siempre devuelve éxito.
 */
final class MockStripeGateway implements PaymentGateway
{
    public function charge(int $amountCents, string $currency, string $description, array $meta = []): array
    {
        return [
            'charge_id' => 'ch_mock_' . Str::random(24),
            'status'    => 'succeeded',
            'raw'       => [
                'amount'   => $amountCents,
                'currency' => $currency,
                'desc'     => $description,
                'meta'     => $meta,
            ],
        ];
    }

    public function refund(string $chargeId, ?int $amountCents = null): array
    {
        return [
            'charge_id' => $chargeId,
            'status'    => 'succeeded',
            'raw'       => ['refunded' => $amountCents],
        ];
    }
}

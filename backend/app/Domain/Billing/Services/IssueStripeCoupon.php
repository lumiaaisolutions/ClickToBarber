<?php

declare(strict_types=1);

namespace App\Domain\Billing\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Emite un Coupon en Stripe (que el cliente puede aplicar a su próxima
 * factura mensual). Cuando un Referral completa su primera cita, este
 * servicio se llama para abonar crédito al referidor.
 *
 * Si STRIPE_DRIVER != stripe o no hay STRIPE_SECRET → mock que loguea.
 */
final class IssueStripeCoupon
{
    /**
     * @return array{coupon_id:?string, mocked:bool}
     */
    public function execute(string $customerId, int $amountCents, string $currency = 'mxn', ?string $reason = null): array
    {
        $driver = (string) (config('services.stripe.driver') ?? env('STRIPE_DRIVER', 'mock'));
        $secret = (string) config('services.stripe.secret');

        if ($driver !== 'stripe' || $secret === '') {
            Log::info('[Stripe/MOCK] Coupon emitido (referral completed)', [
                'customer'   => $customerId,
                'amount'     => $amountCents,
                'currency'   => $currency,
                'reason'     => $reason,
            ]);
            return ['coupon_id' => 'mock_' . bin2hex(random_bytes(8)), 'mocked' => true];
        }

        // 1) Crear Coupon
        $couponRes = Http::asForm()
            ->withBasicAuth($secret, '')
            ->post('https://api.stripe.com/v1/coupons', [
                'amount_off' => $amountCents,
                'currency'   => $currency,
                'duration'   => 'once',
                'name'       => $reason ?? 'LUMIA referral credit',
            ]);

        if ($couponRes->failed()) {
            Log::warning('Stripe Coupon create failed', ['body' => $couponRes->body()]);
            return ['coupon_id' => null, 'mocked' => false];
        }

        $couponId = (string) $couponRes->json('id');

        // 2) Aplicar al customer
        Http::asForm()
            ->withBasicAuth($secret, '')
            ->post("https://api.stripe.com/v1/customers/{$customerId}", [
                'coupon' => $couponId,
            ]);

        return ['coupon_id' => $couponId, 'mocked' => false];
    }
}

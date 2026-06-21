<?php

declare(strict_types=1);

namespace App\Domain\Billing\Services;

use App\Domain\Subscriptions\Models\Plan;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use RuntimeException;

/**
 * Crea una sesión de Stripe Checkout para suscripción.
 *
 * Driver determinado por STRIPE_DRIVER:
 *   - "mock" (default dev): devuelve URL fake con session_id determinístico
 *     que el frontend trata como éxito inmediato. Útil para demos sin keys.
 *   - "stripe": HTTP real a https://api.stripe.com/v1/checkout/sessions.
 *
 * Resultado: ['session_id' => string, 'url' => string].
 */
final class CreateCheckoutSession
{
    private const API = 'https://api.stripe.com/v1';

    /**
     * @param array{
     *   plan_slug: string,
     *   billing_cycle: 'monthly'|'yearly',
     *   email: string,
     *   business_name: string,
     * } $input
     * @return array{session_id:string,url:string}
     */
    public function execute(array $input): array
    {
        $plan = Plan::query()->where('code', $input['plan_slug'])->first();
        if (! $plan || $plan->code === 'free') {
            throw new InvalidArgumentException('Plan inválido para checkout.');
        }

        $cycle = $input['billing_cycle'] === 'yearly' ? 'yearly' : 'monthly';
        $priceId = $this->resolvePriceId($plan->code, $cycle);

        $driver = config('services.stripe.driver', env('STRIPE_DRIVER', 'mock'));
        if ($driver === 'mock' || ! $priceId || ! config('services.stripe.secret')) {
            return $this->mockSession($plan->code, $cycle, $input);
        }

        return $this->createRealSession($priceId, $input);
    }

    private function resolvePriceId(string $planSlug, string $cycle): ?string
    {
        $key = sprintf('STRIPE_PRICE_%s_%s', strtoupper($planSlug), strtoupper($cycle));

        return env($key) ?: null;
    }

    private function mockSession(string $planSlug, string $cycle, array $input): array
    {
        $sessionId = 'cs_mock_' . hash('xxh128', $planSlug . '|' . $cycle . '|' . $input['email'] . '|' . microtime(true));
        $successUrl = (string) env('STRIPE_SUCCESS_URL', 'http://localhost:3000/checkout/success');
        $url = $successUrl . (str_contains($successUrl, '?') ? '&' : '?') . 'session_id=' . $sessionId . '&mock=1';

        logger()->info('[Stripe/MOCK] checkout.session creada', [
            'session_id' => $sessionId,
            'plan'       => $planSlug,
            'cycle'      => $cycle,
            'email'      => $input['email'],
        ]);

        return ['session_id' => $sessionId, 'url' => $url];
    }

    private function createRealSession(string $priceId, array $input): array
    {
        $secret = (string) config('services.stripe.secret');

        $response = Http::asForm()
            ->withBasicAuth($secret, '')
            ->post(self::API . '/checkout/sessions', [
                'mode'                  => 'subscription',
                'success_url'           => env('STRIPE_SUCCESS_URL') . '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url'            => env('STRIPE_CANCEL_URL', 'http://localhost:3000/precios'),
                'customer_email'        => $input['email'],
                'allow_promotion_codes' => 'true',
                'line_items[0][price]'    => $priceId,
                'line_items[0][quantity]' => 1,
                'metadata[plan_slug]'      => $input['plan_slug'],
                'metadata[business_name]'  => $input['business_name'],
                'subscription_data[metadata][plan_slug]' => $input['plan_slug'],
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Stripe Checkout failed: ' . $response->body());
        }

        $data = $response->json();

        return [
            'session_id' => (string) ($data['id'] ?? ''),
            'url'        => (string) ($data['url'] ?? ''),
        ];
    }
}

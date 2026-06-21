<?php

declare(strict_types=1);

namespace App\Domain\Affiliates\Services;

use App\Domain\Affiliates\Models\Affiliate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Stripe Connect Express para affiliates.
 *
 * Flujo:
 *   1. Affiliate hace click en "Conectar mi cuenta" → onboardLink()
 *   2. createAccount() o reuso del existente, luego account_links para
 *      onboarding hospedado por Stripe.
 *   3. Stripe redirige a return_url; refreshStatus() consulta
 *      payouts_enabled.
 *   4. PayAffiliateCommissions usa transfer() (mode=destination) para
 *      mover MXN al connected account.
 *
 * Driver mock: simula los IDs y `payouts_enabled = true` inmediato.
 */
final class StripeConnectService
{
    private const API = 'https://api.stripe.com/v1';

    public function onboardLink(Affiliate $aff, string $returnUrl, string $refreshUrl): string
    {
        if ($this->isMock()) {
            $aff->forceFill([
                'stripe_account_id'      => $aff->stripe_account_id ?: 'acct_mock_' . strtolower(\Illuminate\Support\Str::random(14)),
                'stripe_payouts_enabled' => true,
            ])->save();
            return $returnUrl . (str_contains($returnUrl, '?') ? '&' : '?') . 'mock_connected=1';
        }

        if (! $aff->stripe_account_id) {
            $aff->forceFill(['stripe_account_id' => $this->createExpressAccount($aff)])->save();
        }

        $resp = Http::asForm()->withBasicAuth($this->secret(), '')
            ->post(self::API . '/account_links', [
                'account'     => $aff->stripe_account_id,
                'refresh_url' => $refreshUrl,
                'return_url'  => $returnUrl,
                'type'        => 'account_onboarding',
            ]);

        if ($resp->failed()) {
            Log::error('Stripe Connect onboard link failed', ['body' => $resp->body()]);
            throw new RuntimeException('Stripe Connect link failed.');
        }
        return (string) ($resp->json()['url'] ?? '');
    }

    public function refreshStatus(Affiliate $aff): bool
    {
        if (! $aff->stripe_account_id) return false;
        if ($this->isMock()) {
            $aff->forceFill(['stripe_payouts_enabled' => true])->save();
            return true;
        }

        $resp = Http::withBasicAuth($this->secret(), '')
            ->get(self::API . '/accounts/' . $aff->stripe_account_id);

        if ($resp->failed()) return false;
        $payouts = (bool) ($resp->json()['payouts_enabled'] ?? false);
        $aff->forceFill(['stripe_payouts_enabled' => $payouts])->save();
        return $payouts;
    }

    /**
     * Mueve `amountCents` a la cuenta connected del affiliate.
     * Devuelve el transfer_id (o null en mock/dry-run).
     */
    public function transfer(Affiliate $aff, int $amountCents, string $description): ?string
    {
        if ($amountCents <= 0) return null;
        if (! $aff->stripe_account_id || ! $aff->stripe_payouts_enabled) {
            throw new RuntimeException('Affiliate sin Stripe Connect listo.');
        }

        if ($this->isMock()) {
            Log::info('[StripeConnect/mock] transfer', ['affiliate' => $aff->code, 'cents' => $amountCents, 'desc' => $description]);
            return 'tr_mock_' . strtolower(\Illuminate\Support\Str::random(16));
        }

        $resp = Http::asForm()->withBasicAuth($this->secret(), '')
            ->post(self::API . '/transfers', [
                'amount'      => $amountCents,
                'currency'    => 'mxn',
                'destination' => $aff->stripe_account_id,
                'description' => substr($description, 0, 200),
                'metadata[affiliate_code]' => $aff->code,
            ]);

        if ($resp->failed()) {
            Log::error('Stripe Connect transfer failed', ['body' => $resp->body()]);
            throw new RuntimeException('Stripe transfer failed.');
        }
        return (string) ($resp->json()['id'] ?? null);
    }

    private function createExpressAccount(Affiliate $aff): string
    {
        $resp = Http::asForm()->withBasicAuth($this->secret(), '')
            ->post(self::API . '/accounts', [
                'type'           => 'express',
                'country'        => 'MX',
                'email'          => $aff->email,
                'capabilities[transfers][requested]' => 'true',
                'business_type'  => 'individual',
                'metadata[lumia_affiliate_id]' => (string) $aff->id,
                'metadata[lumia_affiliate_code]' => $aff->code,
            ]);
        if ($resp->failed()) {
            throw new RuntimeException('Stripe Connect account create failed: ' . $resp->body());
        }
        return (string) ($resp->json()['id'] ?? '');
    }

    private function isMock(): bool
    {
        $driver = config('services.stripe.driver', env('STRIPE_DRIVER', 'mock'));
        return $driver === 'mock' || ! config('services.stripe.secret');
    }

    private function secret(): string
    {
        return (string) config('services.stripe.secret');
    }
}

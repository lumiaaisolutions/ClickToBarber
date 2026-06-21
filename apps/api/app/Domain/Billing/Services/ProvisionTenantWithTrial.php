<?php

declare(strict_types=1);

namespace App\Domain\Billing\Services;

use App\Domain\Affiliates\Models\Affiliate;
use App\Domain\Billing\Actions\ProvisionTenant;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Facades\DB;

/**
 * Wrapper sobre ProvisionTenant que añade:
 *  - free trial 14 días (`tenants.trial_ends_at`).
 *  - tracking de affiliate referral si viene en `?aff=`.
 */
final class ProvisionTenantWithTrial
{
    public function __construct(private ProvisionTenant $base) {}

    /**
     * @param array{
     *   email: string,
     *   business_name: string,
     *   plan_slug: string,
     *   billing_cycle: string,
     *   stripe_customer_id?: string,
     *   stripe_subscription_id?: string,
     *   affiliate_code?: string,
     *   trial_days?: int,
     * } $data
     */
    public function execute(array $data): Tenant
    {
        $trialDays = (int) ($data['trial_days'] ?? 14);
        $affiliateCode = $data['affiliate_code'] ?? null;

        $tenant = $this->base->execute($data);

        if ($trialDays > 0) {
            $tenant->forceFill([
                'trial_ends_at' => now()->addDays($trialDays),
            ])->save();
        }

        if ($affiliateCode) {
            $aff = Affiliate::query()->where('code', $affiliateCode)->where('is_active', true)->first();
            if ($aff) {
                DB::table('affiliate_referrals')->insertOrIgnore([
                    'affiliate_id'        => $aff->id,
                    'tenant_id'           => $tenant->id,
                    'mrr_cents_at_signup' => optional($tenant->plan)->price_cents ?? 0,
                    'signed_up_at'        => now(),
                    'created_at'          => now(),
                    'updated_at'          => now(),
                ]);
            }
        }

        return $tenant;
    }
}

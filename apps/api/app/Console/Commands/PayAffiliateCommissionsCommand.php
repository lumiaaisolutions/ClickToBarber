<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Affiliates\Models\Affiliate;
use App\Domain\Affiliates\Services\StripeConnectService;
use App\Domain\Billing\Models\Subscription;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Calcula y acumula comisiones de afiliados del último mes.
 *
 *   php artisan lumia:pay-affiliate-commissions [--dry-run]
 *
 * Para cada `affiliate_referrals` cuyo `signed_up_at >= now()-12 meses`
 * y cuyo tenant está activo:
 *   commission = mrr × affiliate.commission_pct / 100
 *
 * Acumula en `total_commission_paid_cents`. El pago real (Stripe Connect
 * o transferencia) lo hace ops fuera de este comando.
 */
final class PayAffiliateCommissionsCommand extends Command
{
    protected $signature = 'lumia:pay-affiliate-commissions {--dry-run}';
    protected $description = 'Calcula comisiones del mes para afiliados activos';

    public function handle(StripeConnectService $connect): int
    {
        $isDry = (bool) $this->option('dry-run');
        $cutoff = now()->subYear();
        $totalPaid = 0;
        $totalAccruedNoPayout = 0;
        $payoutCount = 0;

        $referrals = DB::table('affiliate_referrals')
            ->where('signed_up_at', '>=', $cutoff)
            ->get();

        foreach ($referrals as $row) {
            $sub = Subscription::query()
                ->where('tenant_id', $row->tenant_id)
                ->where('status', 'active')
                ->latest('id')->first();
            if (! $sub) continue;

            $aff = Affiliate::query()->find($row->affiliate_id);
            if (! $aff || ! $aff->is_active) continue;

            $mrr = $row->mrr_cents_at_signup ?? 0;
            $commission = (int) round($mrr * ($aff->commission_pct / 100));
            if ($commission <= 0) continue;

            $canPayout = $aff->stripe_account_id && $aff->stripe_payouts_enabled;

            if ($isDry) {
                $canPayout ? $totalPaid += $commission : $totalAccruedNoPayout += $commission;
                continue;
            }

            if ($canPayout) {
                try {
                    $connect->transfer($aff, $commission, "LUMIA · {$row->tenant_id} · " . now()->format('Y-m'));
                    DB::table('affiliate_referrals')->where('id', $row->id)->update([
                        'total_commission_paid_cents' => DB::raw("total_commission_paid_cents + {$commission}"),
                        'last_paid_at' => now(),
                        'updated_at'   => now(),
                    ]);
                    $totalPaid += $commission;
                    $payoutCount++;
                } catch (\Throwable $e) {
                    $this->warn("Transfer falló para {$aff->code}: {$e->getMessage()}");
                    $totalAccruedNoPayout += $commission;
                }
            } else {
                // Acumula deuda; ops puede pagar manual hasta que el affiliate
                // conecte Stripe.
                DB::table('affiliate_referrals')->where('id', $row->id)->update([
                    'total_commission_paid_cents' => DB::raw("total_commission_paid_cents + {$commission}"),
                    'updated_at' => now(),
                ]);
                $totalAccruedNoPayout += $commission;
            }
        }

        $this->info(sprintf(
            '%s%d referrals · %d transfers Stripe · %s pagado · %s pendiente sin Connect',
            $isDry ? '[DRY] ' : '',
            $referrals->count(),
            $payoutCount,
            '$' . number_format($totalPaid / 100, 2) . ' MXN',
            '$' . number_format($totalAccruedNoPayout / 100, 2) . ' MXN',
        ));
        return self::SUCCESS;
    }
}

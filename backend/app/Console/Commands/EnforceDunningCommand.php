<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Billing\Models\Subscription;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Console\Command;

/**
 * Ejecuta política de dunning: tras N días en past_due, downgrade a Free.
 *
 *   php artisan lumia:enforce-dunning
 *
 * Recomendado correr diariamente (cron 03:00). Días de gracia configurables
 * por env DUNNING_GRACE_DAYS (default 3).
 */
final class EnforceDunningCommand extends Command
{
    protected $signature = 'lumia:enforce-dunning {--dry-run}';
    protected $description = 'Suspende tenants con past_due > N días (downgrade a Free)';

    public function handle(): int
    {
        $graceDays = (int) env('DUNNING_GRACE_DAYS', 3);
        $cutoff = now()->subDays($graceDays);
        $isDry = (bool) $this->option('dry-run');

        $atRisk = Subscription::query()
            ->where('status', Subscription::STATUS_PAST_DUE)
            ->where('updated_at', '<=', $cutoff)
            ->get();

        if ($atRisk->isEmpty()) {
            $this->info('Nada que hacer: 0 suscripciones en past_due > ' . $graceDays . ' días.');
            return self::SUCCESS;
        }

        $freePlan = Plan::query()->where('code', 'free')->first();
        if (! $freePlan) {
            $this->error('Plan Free no existe — corre PlanSeeder primero.');
            return self::FAILURE;
        }

        foreach ($atRisk as $sub) {
            $tenant = Tenant::query()->withoutGlobalScopes()->find($sub->tenant_id);
            if (! $tenant) {
                continue;
            }

            $this->line(sprintf(
                '%s tenant=%s sub=%s plan=%d → free',
                $isDry ? '[DRY-RUN]' : '[APPLY]',
                $tenant->slug,
                $sub->stripe_subscription_id ?? '?',
                $tenant->plan_id,
            ));

            if ($isDry) {
                continue;
            }

            $sub->forceFill([
                'status' => Subscription::STATUS_CANCELED,
                'canceled_at' => now(),
            ])->save();

            $tenant->forceFill([
                'plan_id'     => $freePlan->id,
                'plan_status' => 'past_due_downgraded',
            ])->save();
        }

        $this->info(sprintf('%d suscripción(es) procesadas.', $atRisk->count()));
        return self::SUCCESS;
    }
}

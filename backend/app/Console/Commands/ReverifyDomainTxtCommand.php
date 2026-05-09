<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Tenancy\Models\TenantDomain;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

/**
 * Re-verifica que cada custom domain verificado siga teniendo el TXT.
 * Si un dueño borra el DNS, marcamos `verified_at = null` para que ya
 * no se resuelva al tenant.
 *
 *   php artisan lumia:reverify-domains [--dry-run]
 */
final class ReverifyDomainTxtCommand extends Command
{
    protected $signature = 'lumia:reverify-domains {--dry-run}';
    protected $description = 'Re-verifica TXT DNS de todos los custom domains verificados';

    public function handle(): int
    {
        $isDry = (bool) $this->option('dry-run');
        $changed = 0;

        TenantDomain::query()
            ->whereNotNull('verified_at')
            ->orderBy('id')
            ->chunk(50, function ($domains) use (&$changed, $isDry) {
                foreach ($domains as $d) {
                    $records = @dns_get_record('_lumia-verify.' . $d->host, DNS_TXT) ?: [];
                    $found = collect($records)->pluck('txt')
                        ->contains($d->verification_token);

                    if (! $found) {
                        $this->line(sprintf(
                            '%s lost TXT: tenant=%s host=%s',
                            $isDry ? '[DRY]' : '[FIX]',
                            $d->tenant_id, $d->host,
                        ));
                        if (! $isDry) {
                            $d->forceFill(['verified_at' => null, 'is_primary' => false])->save();
                            Cache::forget('host_to_tenant:' . $d->host);
                        }
                        $changed++;
                    }
                }
            });

        $this->info("$changed dominio(s) perdieron verificación.");
        return self::SUCCESS;
    }
}

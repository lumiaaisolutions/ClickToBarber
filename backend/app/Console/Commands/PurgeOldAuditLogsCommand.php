<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Audit\Models\AuditLog;
use Illuminate\Console\Command;

/**
 * Borra entradas viejas de audit_logs según política de retención.
 * Default: 365 días. Configurable con AUDIT_RETENTION_DAYS.
 *
 *   php artisan lumia:purge-audit-logs [--days=365] [--dry-run]
 */
final class PurgeOldAuditLogsCommand extends Command
{
    protected $signature = 'lumia:purge-audit-logs {--days=} {--dry-run}';
    protected $description = 'Borra audit_logs anteriores a N días (default 365)';

    public function handle(): int
    {
        $days = (int) ($this->option('days') ?? env('AUDIT_RETENTION_DAYS', 365));
        $cutoff = now()->subDays($days);
        $isDry = (bool) $this->option('dry-run');

        $count = AuditLog::query()->where('created_at', '<', $cutoff)->count();
        if ($count === 0) {
            $this->info('Nada que purgar.');
            return self::SUCCESS;
        }

        if ($isDry) {
            $this->info("[DRY] Borraría {$count} entradas anteriores a {$cutoff->toDateString()}");
            return self::SUCCESS;
        }

        AuditLog::query()->where('created_at', '<', $cutoff)->delete();
        $this->info("Eliminadas {$count} entradas.");
        return self::SUCCESS;
    }
}

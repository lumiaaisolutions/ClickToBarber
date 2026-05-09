<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Growth\Models\Referral;
use Illuminate\Console\Command;

/**
 * Marca como expirados los referrals pending cuyo expires_at ya pasó.
 *   php artisan lumia:expire-referrals
 */
final class ExpireReferralsCommand extends Command
{
    protected $signature = 'lumia:expire-referrals';
    protected $description = 'Marca como expirados los referrals pending vencidos';

    public function handle(): int
    {
        $expired = Referral::query()
            ->where('status', Referral::STATUS_PENDING)
            ->where('expires_at', '<', now())
            ->update(['status' => Referral::STATUS_EXPIRED]);

        $this->info("$expired referral(s) marcados como expirados.");
        return self::SUCCESS;
    }
}

<?php

declare(strict_types=1);

namespace App\Domain\Marketing\Services;

use App\Domain\Identity\Models\User;
use App\Infrastructure\Persistence\Tenancy\TenantScope;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

final class RetentionScan
{
    /**
     * Devuelve clientes con última visita anterior a `now() - $daysSince`.
     */
    public function inactiveClients(string $tenantId, int $daysSince = 30): Collection
    {
        $cutoff = CarbonImmutable::now()->subDays($daysSince);

        return User::withoutGlobalScope(TenantScope::class)
            ->where('tenant_id', $tenantId)
            ->where('role', User::ROLE_CLIENT)
            ->where(function ($q) use ($cutoff) {
                $q->where('last_visit_at', '<', $cutoff)
                  ->orWhereNull('last_visit_at');
            })
            ->orderBy('last_visit_at', 'asc')
            ->get();
    }
}

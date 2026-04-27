<?php

declare(strict_types=1);

namespace App\Domain\Subscriptions\Contracts;

use App\Domain\Tenancy\Models\Tenant;

interface FeatureGate
{
    public function isEnabled(Tenant $tenant, string $feature): bool;

    public function requiredPlanFor(string $feature): ?string;
}

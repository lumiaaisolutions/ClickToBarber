<?php

declare(strict_types=1);

namespace App\Domain\Subscriptions\Services;

use App\Domain\Subscriptions\Contracts\FeatureGate;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\Models\Tenant;

final class PlanFeatureGate implements FeatureGate
{
    public function isEnabled(Tenant $tenant, string $feature): bool
    {
        return $tenant->hasFeature($feature);
    }

    public function requiredPlanFor(string $feature): ?string
    {
        $plan = Plan::orderBy('sort_order')->get()
            ->first(fn (Plan $p) => $p->hasFeature($feature));

        return $plan?->code;
    }
}

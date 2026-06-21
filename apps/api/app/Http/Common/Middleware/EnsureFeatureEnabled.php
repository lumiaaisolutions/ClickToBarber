<?php

declare(strict_types=1);

namespace App\Http\Common\Middleware;

use App\Domain\Subscriptions\Contracts\FeatureGate;
use App\Domain\Tenancy\CurrentTenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloquea la acción si el tenant actual no tiene la feature habilitada.
 * Devuelve 402 Payment Required con payload {required_plan, upgrade_url}.
 */
final class EnsureFeatureEnabled
{
    public function __construct(
        private CurrentTenant $current,
        private FeatureGate $gate,
    ) {}

    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $tenant = $this->current->get();

        if (! $tenant || ! $this->gate->isEnabled($tenant, $feature)) {
            return response()->json([
                'error'         => 'feature_locked',
                'feature'       => $feature,
                'required_plan' => $this->gate->requiredPlanFor($feature),
                'upgrade_url'   => '/admin/billing/upgrade',
                'message'       => 'Esta función requiere un plan superior.',
            ], 402);
        }

        return $next($request);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Client\Controllers;

use App\Domain\Engagement\Models\Rating;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Client\Resources\BarberPublicResource;
use App\Http\Client\Resources\PublicTenantResource;
use App\Http\Client\Resources\ServicePublicResource;

final class PublicTenantController
{
    public function __invoke(string $slug)
    {
        $tenant = Tenant::with('plan')->where('slug', $slug)->firstOrFail();

        $tenant->load([
            'barbers' => fn ($q) => $q->where('is_active', true)->orderBy('display_order'),
            'services' => fn ($q) => $q->where('is_active', true)->orderBy('display_order'),
        ]);

        $ratings = Rating::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_published', true)
            ->whereNotNull('submitted_at')
            ->where('stars', '>=', 1)
            ->orderByDesc('submitted_at')
            ->get(['stars', 'comment', 'submitted_at']);

        $count = $ratings->count();

        return [
            'tenant'   => new PublicTenantResource($tenant),
            'barbers'  => BarberPublicResource::collection($tenant->barbers),
            'services' => ServicePublicResource::collection($tenant->services),
            'reputation' => [
                'count'       => $count,
                'avg'         => $count > 0 ? round($ratings->avg('stars'), 1) : null,
                'highlights'  => $ratings->where('stars', '>=', 5)->take(3)
                    ->map(fn ($r) => ['stars' => $r->stars, 'comment' => $r->comment])
                    ->values()
                    ->all(),
            ],
        ];
    }
}

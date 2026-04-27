<?php

declare(strict_types=1);

namespace App\Http\Client\Controllers;

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

        return [
            'tenant'   => new PublicTenantResource($tenant),
            'barbers'  => BarberPublicResource::collection($tenant->barbers),
            'services' => ServicePublicResource::collection($tenant->services),
        ];
    }
}

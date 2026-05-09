<?php

declare(strict_types=1);

namespace App\Domain\Memberships\Models;

use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class Membership extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'name', 'price_cents', 'currency',
        'included_services_per_month', 'eligible_service_ids', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'eligible_service_ids' => 'array',
            'is_active'            => 'boolean',
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Domain\Platform\Models;

use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class OutboundWebhook extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'url', 'events', 'secret', 'is_active',
        'last_success_at', 'last_failure_at', 'consecutive_failures',
    ];

    protected function casts(): array
    {
        return [
            'events'           => 'array',
            'is_active'        => 'boolean',
            'last_success_at'  => 'datetime',
            'last_failure_at'  => 'datetime',
        ];
    }

    public static function newSecret(): string
    {
        return 'whsec_' . Str::random(40);
    }
}

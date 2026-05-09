<?php

declare(strict_types=1);

namespace App\Domain\Growth\Models;

use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class LoyaltyVisit extends Model
{
    use BelongsToTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id', 'user_id', 'appointment_id', 'credited_at',
    ];

    protected function casts(): array
    {
        return ['credited_at' => 'datetime'];
    }
}

<?php

declare(strict_types=1);

namespace App\Domain\Operations\Models;

use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class WalkInQueueEntry extends Model
{
    use BelongsToTenant;

    protected $table = 'walk_in_queue';

    protected $fillable = [
        'tenant_id', 'client_name', 'client_phone',
        'barber_id', 'service_id', 'status',
        'estimated_minutes', 'arrived_at', 'called_at', 'served_at',
    ];

    protected function casts(): array
    {
        return [
            'arrived_at' => 'datetime',
            'called_at'  => 'datetime',
            'served_at'  => 'datetime',
        ];
    }

    public const STATUS_WAITING     = 'waiting';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_SERVED      = 'served';
    public const STATUS_ABANDONED   = 'abandoned';
}

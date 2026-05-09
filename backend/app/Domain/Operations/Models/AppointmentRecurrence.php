<?php

declare(strict_types=1);

namespace App\Domain\Operations\Models;

use App\Domain\Catalog\Models\Service;
use App\Domain\Identity\Models\User;
use App\Domain\Staff\Models\Barber;
use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentRecurrence extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'user_id', 'barber_id', 'service_id',
        'frequency', 'weekday', 'day_of_month', 'time_local',
        'starts_on', 'ends_on', 'last_materialized_at', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'starts_on'             => 'date',
            'ends_on'               => 'date',
            'last_materialized_at'  => 'datetime',
            'is_active'             => 'boolean',
        ];
    }

    public const FREQ_WEEKLY    = 'weekly';
    public const FREQ_BIWEEKLY  = 'biweekly';
    public const FREQ_MONTHLY   = 'monthly';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function barber(): BelongsTo
    {
        return $this->belongsTo(Barber::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}

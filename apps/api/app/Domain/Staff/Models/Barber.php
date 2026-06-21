<?php

declare(strict_types=1);

namespace App\Domain\Staff\Models;

use App\Domain\Catalog\Models\Service;
use App\Domain\Identity\Models\User;
use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Barber extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'user_id', 'name', 'email', 'phone', 'avatar_url',
        'bio', 'specialties', 'default_slot_minutes',
        'commission_pct', 'is_active', 'display_order',
    ];

    protected $casts = [
        'specialties'         => 'array',
        'is_active'           => 'boolean',
        'commission_pct'      => 'integer',
        'default_slot_minutes'=> 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(BarberShift::class);
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'barber_service')
            ->withPivot(['override_price_cents', 'override_duration_minutes', 'tenant_id'])
            ->withTimestamps();
    }
}

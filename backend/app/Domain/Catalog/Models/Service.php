<?php

declare(strict_types=1);

namespace App\Domain\Catalog\Models;

use App\Domain\Staff\Models\Barber;
use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Service extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'name', 'description', 'duration_minutes',
        'price_cents', 'currency', 'image_url', 'is_active', 'display_order',
    ];

    protected $casts = [
        'is_active'        => 'boolean',
        'price_cents'      => 'integer',
        'duration_minutes' => 'integer',
    ];

    public function barbers(): BelongsToMany
    {
        return $this->belongsToMany(Barber::class, 'barber_service')->withTimestamps();
    }
}

<?php

declare(strict_types=1);

namespace App\Domain\Tenancy\Models;

use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Staff\Models\Barber;
use App\Domain\Catalog\Models\Service;
use App\Domain\Catalog\Models\Product;
use App\Domain\Appointments\Models\Appointment;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use HasUuids, HasFactory, SoftDeletes;

    protected $fillable = [
        'slug', 'name', 'owner_email', 'plan_id', 'plan_status', 'trial_ends_at',
        'settings', 'timezone', 'phone', 'whatsapp_number',
        'address', 'latitude', 'longitude', 'cover_image_url', 'logo_url',
    ];

    protected $casts = [
        'settings'      => 'array',
        'trial_ends_at' => 'datetime',
        'latitude'      => 'float',
        'longitude'     => 'float',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function barbers(): HasMany
    {
        return $this->hasMany(Barber::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function branding(): HasOne
    {
        return $this->hasOne(TenantBranding::class);
    }

    public function depositPercentage(): int
    {
        return (int) ($this->settings['deposit_pct'] ?? 30);
    }

    public function hasFeature(string $feature): bool
    {
        return $this->plan?->hasFeature($feature) ?? false;
    }
}

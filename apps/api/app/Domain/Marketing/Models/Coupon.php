<?php

declare(strict_types=1);

namespace App\Domain\Marketing\Models;

use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'campaign_id', 'client_id', 'code',
        'discount_pct', 'discount_cents', 'expires_at', 'redeemed_at',
    ];

    protected $casts = [
        'expires_at'  => 'datetime',
        'redeemed_at' => 'datetime',
    ];
}

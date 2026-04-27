<?php

declare(strict_types=1);

namespace App\Domain\Marketing\Models;

use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Campaign extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'name', 'type', 'segment_filter', 'channel',
        'template_body', 'coupon_code', 'discount_pct',
        'scheduled_at', 'sent_at', 'recipients_count',
        'opened_count', 'redeemed_count', 'status',
    ];

    protected $casts = [
        'segment_filter' => 'array',
        'scheduled_at'   => 'datetime',
        'sent_at'        => 'datetime',
    ];
}

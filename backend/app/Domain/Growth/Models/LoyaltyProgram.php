<?php

declare(strict_types=1);

namespace App\Domain\Growth\Models;

use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoyaltyProgram extends Model
{
    protected $fillable = [
        'tenant_id', 'is_active', 'every_n_visits',
        'reward_type', 'reward_value', 'reward_label', 'expiry_days',
    ];

    protected function casts(): array
    {
        return [
            'is_active'      => 'boolean',
            'every_n_visits' => 'integer',
            'reward_value'   => 'integer',
            'expiry_days'    => 'integer',
        ];
    }

    public const TYPE_DISCOUNT_PCT  = 'discount_pct';
    public const TYPE_FREE_SERVICE  = 'free_service';

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}

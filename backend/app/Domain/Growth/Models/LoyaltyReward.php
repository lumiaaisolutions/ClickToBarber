<?php

declare(strict_types=1);

namespace App\Domain\Growth\Models;

use App\Domain\Identity\Models\User;
use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class LoyaltyReward extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'user_id', 'code', 'reward_type', 'reward_value',
        'reward_label', 'issued_at', 'expires_at',
        'redeemed_at', 'redeemed_appointment_id',
    ];

    protected function casts(): array
    {
        return [
            'issued_at'   => 'datetime',
            'expires_at'  => 'datetime',
            'redeemed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function newCode(): string
    {
        return 'RW-' . strtoupper(Str::random(6));
    }

    public function isUsable(): bool
    {
        return $this->redeemed_at === null
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }
}

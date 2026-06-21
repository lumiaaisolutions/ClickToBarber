<?php

declare(strict_types=1);

namespace App\Domain\Memberships\Models;

use App\Domain\Identity\Models\User;
use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class GiftCard extends Model
{
    use BelongsToTenant;

    protected $table = 'gift_cards';

    protected $fillable = [
        'tenant_id', 'code', 'value_cents', 'balance_cents', 'currency',
        'purchaser_user_id', 'recipient_email', 'recipient_name', 'message',
        'redeemed_at', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'redeemed_at' => 'datetime',
            'expires_at'  => 'datetime',
        ];
    }

    public static function newCode(): string
    {
        return 'GIFT-' . strtoupper(Str::random(8));
    }

    public function purchaser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'purchaser_user_id');
    }

    public function isUsable(): bool
    {
        if ($this->balance_cents <= 0) return false;
        if ($this->expires_at && $this->expires_at->isPast()) return false;
        return true;
    }

    public function redeem(int $amountCents): int
    {
        $applied = min($amountCents, $this->balance_cents);
        $this->balance_cents -= $applied;
        if ($this->balance_cents === 0) {
            $this->redeemed_at = now();
        }
        $this->save();
        return $applied;
    }
}

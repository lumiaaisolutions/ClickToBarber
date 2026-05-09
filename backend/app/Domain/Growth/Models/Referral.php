<?php

declare(strict_types=1);

namespace App\Domain\Growth\Models;

use App\Domain\Identity\Models\User;
use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Referral extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'referrer_user_id', 'referred_email', 'code',
        'status', 'reward_referrer_cents', 'reward_referred_cents',
        'referred_user_id', 'first_appointment_id',
        'signed_up_at', 'completed_at', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'signed_up_at' => 'datetime',
            'completed_at' => 'datetime',
            'expires_at'   => 'datetime',
        ];
    }

    public const STATUS_PENDING    = 'pending';
    public const STATUS_SIGNED_UP  = 'signed_up';
    public const STATUS_COMPLETED  = 'completed';
    public const STATUS_EXPIRED    = 'expired';

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referrer_user_id');
    }

    public function referred(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referred_user_id');
    }

    public static function newCode(string $tenantSlug): string
    {
        $prefix = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $tenantSlug) ?: 'LUM', 0, 4));

        return $prefix . '-' . strtoupper(Str::random(4));
    }
}

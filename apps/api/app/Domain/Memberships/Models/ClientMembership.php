<?php

declare(strict_types=1);

namespace App\Domain\Memberships\Models;

use App\Domain\Identity\Models\User;
use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientMembership extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'user_id', 'membership_id',
        'services_used_this_period',
        'current_period_starts_on', 'current_period_ends_on',
        'status', 'stripe_subscription_id',
    ];

    protected function casts(): array
    {
        return [
            'current_period_starts_on' => 'date',
            'current_period_ends_on'   => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function membership(): BelongsTo
    {
        return $this->belongsTo(Membership::class);
    }

    public function hasRemainingServices(): bool
    {
        return $this->services_used_this_period < ($this->membership?->included_services_per_month ?? 0);
    }
}

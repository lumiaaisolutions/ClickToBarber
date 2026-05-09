<?php

declare(strict_types=1);

namespace App\Domain\Billing\Models;

use App\Domain\Audit\LoggableChanges;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    use LoggableChanges;

    protected $table = 'subscriptions';

    protected $fillable = [
        'tenant_id', 'plan_id', 'status', 'billing_cycle',
        'stripe_customer_id', 'stripe_subscription_id', 'mercadopago_subscription_id',
        'current_period_starts_at', 'current_period_ends_at', 'canceled_at',
    ];

    protected function casts(): array
    {
        return [
            'current_period_starts_at' => 'datetime',
            'current_period_ends_at'   => 'datetime',
            'canceled_at'              => 'datetime',
        ];
    }

    public const STATUS_ACTIVE     = 'active';
    public const STATUS_TRIALING   = 'trialing';
    public const STATUS_PAST_DUE   = 'past_due';
    public const STATUS_CANCELED   = 'canceled';
    public const STATUS_INCOMPLETE = 'incomplete';

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}

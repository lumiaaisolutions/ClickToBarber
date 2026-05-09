<?php

declare(strict_types=1);

namespace App\Domain\Affiliates\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Affiliate extends Model
{
    protected $fillable = [
        'email', 'name', 'code', 'commission_pct', 'is_active',
        'stripe_account_id', 'stripe_payouts_enabled',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'stripe_payouts_enabled' => 'boolean',
    ];

    public static function newCode(): string
    {
        return 'AFF-' . strtoupper(Str::random(6));
    }
}

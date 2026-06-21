<?php

declare(strict_types=1);

namespace App\Domain\Identity\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserLoginEvent extends Model
{
    protected $table = 'user_login_events';
    public $timestamps = false;

    protected $fillable = [
        'tenant_id', 'user_id', 'ip_address',
        'user_agent_hash', 'user_agent', 'country',
        'result', 'alert_sent', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'alert_sent' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public const RESULT_SUCCESS         = 'success';
    public const RESULT_FAILED           = 'failed';
    public const RESULT_TWOFA_REQUIRED   = 'twofa_required';
    public const RESULT_TWOFA_FAILED     = 'twofa_failed';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

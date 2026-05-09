<?php

declare(strict_types=1);

namespace App\Domain\Audit\Models;

use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    protected $table = 'audit_logs';
    public $timestamps = false;

    protected $fillable = [
        'tenant_id', 'actor_user_id', 'actor_email',
        'action', 'subject_type', 'subject_id', 'changes',
        'ip_address', 'request_id', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'changes'    => 'array',
            'created_at' => 'datetime',
        ];
    }

    public const ACTION_CREATED = 'created';
    public const ACTION_UPDATED = 'updated';
    public const ACTION_DELETED = 'deleted';
    public const ACTION_LOGIN_SUCCESS = 'login.success';
    public const ACTION_LOGIN_FAILED  = 'login.failed';
    public const ACTION_2FA_ENABLED   = '2fa.enabled';
    public const ACTION_2FA_DISABLED  = '2fa.disabled';

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}

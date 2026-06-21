<?php

declare(strict_types=1);

namespace App\Domain\Operations\Models;

use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InAppNotification extends Model
{
    protected $table = 'in_app_notifications';
    public $timestamps = false;

    protected $fillable = [
        'tenant_id', 'user_id', 'type', 'title', 'body', 'url',
        'read_at', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at'    => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function notify(int $userId, string $type, string $title, ?string $body = null, ?string $url = null, ?string $tenantId = null): self
    {
        return self::create([
            'tenant_id'  => $tenantId ?? app(\App\Domain\Tenancy\CurrentTenant::class)->id(),
            'user_id'    => $userId,
            'type'       => $type,
            'title'      => $title,
            'body'       => $body,
            'url'        => $url,
            'created_at' => now(),
        ]);
    }
}

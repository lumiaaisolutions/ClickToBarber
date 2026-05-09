<?php

declare(strict_types=1);

namespace App\Domain\Calendar\Models;

use App\Domain\Identity\Models\User;
use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarConnection extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'user_id', 'provider',
        'access_token', 'refresh_token', 'access_token_expires_at',
        'account_email', 'calendar_id', 'scope',
        'is_active', 'last_synced_at',
    ];

    protected $hidden = ['access_token', 'refresh_token'];

    protected function casts(): array
    {
        return [
            'access_token'             => 'encrypted',
            'refresh_token'            => 'encrypted',
            'access_token_expires_at'  => 'datetime',
            'last_synced_at'           => 'datetime',
            'is_active'                => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

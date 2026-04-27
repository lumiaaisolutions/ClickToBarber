<?php

declare(strict_types=1);

namespace App\Domain\Identity\Models;

use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    public const ROLE_PLATFORM_OWNER = 'platform_owner';
    public const ROLE_ADMIN          = 'admin';
    public const ROLE_BARBER         = 'barber';
    public const ROLE_CLIENT         = 'client';

    protected $fillable = [
        'tenant_id', 'name', 'email', 'phone', 'role',
        'password', 'preferences', 'last_visit_at',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_visit_at'     => 'datetime',
            'password'          => 'hashed',
            'preferences'       => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function isAdmin(): bool   { return $this->role === self::ROLE_ADMIN; }
    public function isBarber(): bool  { return $this->role === self::ROLE_BARBER; }
    public function isClient(): bool  { return $this->role === self::ROLE_CLIENT; }
}

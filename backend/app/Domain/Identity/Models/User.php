<?php

declare(strict_types=1);

namespace App\Domain\Identity\Models;

use App\Domain\Tenancy\Models\Tenant;
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
    public const ROLE_MANAGER        = 'manager';
    public const ROLE_RECEPTIONIST   = 'receptionist';
    public const ROLE_BARBER         = 'barber';
    public const ROLE_CLIENT         = 'client';

    /** Roles que pueden iniciar sesión en el portal /admin. */
    public const PORTAL_ROLES = [
        self::ROLE_PLATFORM_OWNER,
        self::ROLE_ADMIN,
        self::ROLE_MANAGER,
        self::ROLE_RECEPTIONIST,
        self::ROLE_BARBER,
    ];

    protected $fillable = [
        'tenant_id', 'name', 'email', 'phone', 'role',
        'password', 'preferences', 'last_visit_at', 'first_login_at',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'first_login_at'    => 'datetime',
            'last_visit_at'     => 'datetime',
            'password'          => 'hashed',
            'preferences'       => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function isPlatformOwner(): bool { return $this->role === self::ROLE_PLATFORM_OWNER; }
    public function isAdmin(): bool         { return $this->role === self::ROLE_ADMIN; }
    public function isManager(): bool       { return $this->role === self::ROLE_MANAGER; }
    public function isReceptionist(): bool  { return $this->role === self::ROLE_RECEPTIONIST; }
    public function isBarber(): bool        { return $this->role === self::ROLE_BARBER; }
    public function isClient(): bool        { return $this->role === self::ROLE_CLIENT; }

    public function hasAnyRole(string ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    /** Roles con permiso de escritura completa (CRUD) sobre el tenant. */
    public function canWrite(): bool
    {
        return $this->hasAnyRole(
            self::ROLE_PLATFORM_OWNER,
            self::ROLE_ADMIN,
            self::ROLE_MANAGER,
        );
    }

    /** Roles que pueden ver finanzas. */
    public function canSeeFinance(): bool
    {
        return $this->hasAnyRole(
            self::ROLE_PLATFORM_OWNER,
            self::ROLE_ADMIN,
            self::ROLE_MANAGER,
        );
    }
}

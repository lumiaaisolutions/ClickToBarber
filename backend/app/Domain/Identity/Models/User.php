<?php

declare(strict_types=1);

namespace App\Domain\Identity\Models;

use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Domain\Audit\LoggableChanges;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, LoggableChanges, Notifiable, SoftDeletes;

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
        'password', 'preferences', 'notes',
        'last_visit_at', 'first_login_at',
    ];

    protected $hidden = [
        'password', 'remember_token', 'phone_hash',
        'two_factor_secret', 'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'        => 'datetime',
            'first_login_at'           => 'datetime',
            'last_visit_at'            => 'datetime',
            'two_factor_confirmed_at'  => 'datetime',
            'password'                 => 'hashed',
            'preferences'              => 'array',
            'phone'                    => 'encrypted',
            'notes'                    => 'encrypted',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (User $user) {
            // Mantiene phone_hash sincronizado para lookups indexables
            // sobre teléfonos cifrados en reposo.
            if ($user->isDirty('phone')) {
                $phone = $user->getAttribute('phone');
                $user->setAttribute(
                    'phone_hash',
                    $phone ? self::hashPhone((string) $phone) : null,
                );
            }
        });
    }

    /** Normaliza y hashea un teléfono para búsqueda indexable. */
    public static function hashPhone(string $phone): string
    {
        $normalized = preg_replace('/[^0-9+]/', '', $phone) ?? '';

        return hash('sha256', $normalized);
    }

    /**
     * Busca un usuario por teléfono dentro de un tenant usando el hash.
     * Reemplaza a `where('phone', $phone)` que no funciona con cifrado.
     */
    public static function findByPhone(string $tenantId, string $phone): ?self
    {
        return static::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('phone_hash', self::hashPhone($phone))
            ->first();
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

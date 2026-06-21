<?php

declare(strict_types=1);

namespace App\Domain\Platform\Models;

use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ApiKey extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'name', 'prefix', 'hash', 'scopes',
        'last_used_at', 'expires_at', 'revoked_at', 'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'scopes'        => 'array',
            'last_used_at'  => 'datetime',
            'expires_at'    => 'datetime',
            'revoked_at'    => 'datetime',
        ];
    }

    /** @return array{ApiKey, string} modelo + token plano (que sólo se ve una vez) */
    public static function issue(string $tenantId, string $name, array $scopes, ?int $byUser = null, ?int $expiresInDays = null): array
    {
        $secret = Str::random(40);
        $token  = 'lk_' . substr(hash('sha256', $secret), 0, 8) . '_' . $secret;
        $prefix = substr($token, 0, 12);
        $hash   = hash('sha256', $token);

        $key = self::create([
            'tenant_id'         => $tenantId,
            'name'              => $name,
            'prefix'            => $prefix,
            'hash'              => $hash,
            'scopes'            => $scopes,
            'expires_at'        => $expiresInDays ? now()->addDays($expiresInDays) : null,
            'created_by_user_id' => $byUser,
        ]);

        return [$key, $token];
    }

    public function isUsable(): bool
    {
        if ($this->revoked_at) {
            return false;
        }
        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }
        return true;
    }
}

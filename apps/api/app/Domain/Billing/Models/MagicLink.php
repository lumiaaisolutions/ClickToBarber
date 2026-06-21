<?php

declare(strict_types=1);

namespace App\Domain\Billing\Models;

use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class MagicLink extends Model
{
    protected $table = 'magic_links';

    protected $fillable = [
        'tenant_id', 'user_id', 'token_hash', 'purpose',
        'expires_at', 'used_at', 'ip_used',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'used_at'    => 'datetime',
        ];
    }

    public const PURPOSE_ONBOARDING     = 'onboarding';
    public const PURPOSE_PASSWORD_RESET = 'password_reset';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Genera un nuevo magic link y devuelve la tupla [modelo, tokenPlano].
     * El token plano sólo existe en memoria — sólo el hash se persiste.
     */
    public static function issue(User $user, string $purpose, int $ttlMinutes): array
    {
        $token = Str::random(48);
        $link = static::create([
            'tenant_id'  => $user->tenant_id,
            'user_id'    => $user->id,
            'token_hash' => hash('sha256', $token),
            'purpose'    => $purpose,
            'expires_at' => now()->addMinutes($ttlMinutes),
        ]);

        return [$link, $token];
    }

    public static function findValidByToken(string $token, string $purpose): ?self
    {
        return static::query()
            ->where('token_hash', hash('sha256', $token))
            ->where('purpose', $purpose)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();
    }

    public function markUsed(?string $ip = null): void
    {
        $this->forceFill([
            'used_at' => now(),
            'ip_used' => $ip,
        ])->save();
    }
}

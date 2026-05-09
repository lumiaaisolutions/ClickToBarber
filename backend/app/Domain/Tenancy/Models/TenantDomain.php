<?php

declare(strict_types=1);

namespace App\Domain\Tenancy\Models;

use App\Domain\Audit\LoggableChanges;
use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class TenantDomain extends Model
{
    use BelongsToTenant, LoggableChanges;

    protected $table = 'tenant_domains';

    protected $fillable = [
        'tenant_id', 'host', 'verification_token', 'verified_at', 'is_primary',
    ];

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'is_primary'  => 'boolean',
        ];
    }

    public static function newVerificationToken(): string
    {
        return 'lumia-' . Str::lower(Str::random(32));
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}

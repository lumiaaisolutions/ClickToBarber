<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Tenancy;

use App\Domain\Tenancy\CurrentTenant;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Trait para modelos tenant-scoped.
 * - Aplica un Global Scope que filtra por tenant_id (cuando hay tenant resuelto).
 * - Asigna automáticamente tenant_id al crear si no se proporcionó.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function ($model) {
            if (! $model->getAttribute('tenant_id')) {
                $current = app(CurrentTenant::class);
                if ($current->isSet()) {
                    $model->setAttribute('tenant_id', $current->id());
                }
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->withoutGlobalScope(TenantScope::class)
                     ->where($this->qualifyColumn('tenant_id'), $tenantId);
    }
}

<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Tenancy;

use App\Domain\Tenancy\CurrentTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $current = app(CurrentTenant::class);
        if ($current->isSet()) {
            $builder->where($model->qualifyColumn('tenant_id'), $current->id());
        }
    }
}

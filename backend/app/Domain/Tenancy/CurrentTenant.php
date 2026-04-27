<?php

declare(strict_types=1);

namespace App\Domain\Tenancy;

use App\Domain\Tenancy\Models\Tenant;

/**
 * Holder del tenant resuelto para la request actual.
 * Se inyecta en el container vía middleware ResolveTenant.
 */
final class CurrentTenant
{
    private ?Tenant $tenant = null;

    public function set(Tenant $tenant): void
    {
        $this->tenant = $tenant;
    }

    public function get(): ?Tenant
    {
        return $this->tenant;
    }

    public function id(): ?string
    {
        return $this->tenant?->id;
    }

    public function require(): Tenant
    {
        if ($this->tenant === null) {
            throw new \RuntimeException('No hay tenant resuelto en la request actual.');
        }
        return $this->tenant;
    }

    public function isSet(): bool
    {
        return $this->tenant !== null;
    }
}

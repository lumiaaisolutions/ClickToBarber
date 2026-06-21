<?php

declare(strict_types=1);

namespace App\Infrastructure\CircuitBreaker;

interface CircuitBreaker
{
    /**
     * Ejecuta la operación protegida por el circuito.
     *
     * @template T
     * @param  callable():T  $operation
     * @throws CircuitOpenException si el circuito está abierto.
     * @return T
     */
    public function call(string $integration, callable $operation, ?string $scope = null): mixed;

    public function state(string $integration, ?string $scope = null): CircuitState;

    public function forceOpen(string $integration, ?string $scope = null): void;

    public function forceClose(string $integration, ?string $scope = null): void;
}

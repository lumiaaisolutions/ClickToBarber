<?php

declare(strict_types=1);

namespace App\Infrastructure\CircuitBreaker;

use RuntimeException;

class CircuitOpenException extends RuntimeException
{
    public function __construct(public readonly string $integration, public readonly ?string $scope = null)
    {
        parent::__construct(
            "Circuito '{$integration}'" . ($scope ? " (scope: {$scope})" : '') . ' está abierto.'
        );
    }
}

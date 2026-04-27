<?php

declare(strict_types=1);

namespace App\Domain\Appointments\Exceptions;

use DomainException;

class SlotAlreadyBooked extends DomainException
{
    public function __construct(int $barberId, string $startsAt)
    {
        parent::__construct("El barbero {$barberId} ya tiene una cita en {$startsAt}.");
    }
}

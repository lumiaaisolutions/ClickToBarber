<?php

declare(strict_types=1);

namespace App\Domain\Appointments\Events;

use Illuminate\Foundation\Events\Dispatchable;

final class AppointmentCancelled
{
    use Dispatchable;

    public function __construct(
        public readonly int $appointmentId,
        public readonly string $tenantId,
        public readonly string $reason,
        public readonly string $by, // 'system'|'client'|'admin'
    ) {}
}

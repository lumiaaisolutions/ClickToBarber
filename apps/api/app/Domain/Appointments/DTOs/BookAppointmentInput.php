<?php

declare(strict_types=1);

namespace App\Domain\Appointments\DTOs;

final readonly class BookAppointmentInput
{
    public function __construct(
        public string $tenantId,
        public int $barberId,
        public int $serviceId,
        public string $clientName,
        public string $clientEmail,
        public ?string $clientPhone = null,
        public string $startsAt = '',         // ISO 8601
        public ?string $notes = null,
        public ?string $referralCode = null,  // ?ref= capturado del booking flow
    ) {}
}

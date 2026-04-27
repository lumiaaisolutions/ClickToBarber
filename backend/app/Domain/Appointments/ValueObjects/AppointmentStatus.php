<?php

declare(strict_types=1);

namespace App\Domain\Appointments\ValueObjects;

enum AppointmentStatus: string
{
    case PendingConfirmation = 'pending_confirmation';
    case Confirmed           = 'confirmed';
    case InProgress          = 'in_progress';
    case Completed           = 'completed';
    case Cancelled           = 'cancelled';
    case NoShow              = 'no_show';

    public function label(): string
    {
        return match ($this) {
            self::PendingConfirmation => 'Pendiente de confirmar',
            self::Confirmed           => 'Confirmada',
            self::InProgress          => 'En curso',
            self::Completed           => 'Completada',
            self::Cancelled           => 'Cancelada',
            self::NoShow              => 'No se presentó',
        };
    }

    public function isActive(): bool
    {
        return in_array($this, [self::PendingConfirmation, self::Confirmed, self::InProgress], true);
    }

    public function canBeCancelled(): bool
    {
        return in_array($this, [self::PendingConfirmation, self::Confirmed], true);
    }
}

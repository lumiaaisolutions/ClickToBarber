<?php

declare(strict_types=1);

namespace App\Domain\Appointments\Models;

use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use App\Domain\Catalog\Models\Service;
use App\Domain\Identity\Models\User;
use App\Domain\Staff\Models\Barber;
use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Appointment extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'barber_id', 'service_id', 'client_id',
        'starts_at', 'ends_at', 'status',
        'price_cents', 'deposit_cents', 'deposit_status',
        'source', 'notes', 'reminder_sent_at',
        'confirmed_at', 'cancelled_at', 'cancelled_by', 'cancellation_reason',
    ];

    protected $casts = [
        'starts_at'        => 'datetime',
        'ends_at'          => 'datetime',
        'reminder_sent_at' => 'datetime',
        'confirmed_at'     => 'datetime',
        'cancelled_at'     => 'datetime',
        'price_cents'      => 'integer',
        'deposit_cents'    => 'integer',
        'status'           => AppointmentStatus::class,
    ];

    public function barber(): BelongsTo
    {
        return $this->belongsTo(Barber::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(AppointmentStatusHistory::class);
    }
}

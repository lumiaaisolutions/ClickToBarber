<?php

declare(strict_types=1);

namespace App\Domain\PointOfSale\Models;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Identity\Models\User;
use App\Domain\Staff\Models\Barber;
use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'appointment_id', 'barber_id', 'client_id',
        'subtotal_cents', 'tip_cents', 'discount_cents', 'total_cents',
        'payment_method', 'status', 'closed_at',
    ];

    protected $casts = [
        'closed_at'      => 'datetime',
        'subtotal_cents' => 'integer',
        'tip_cents'      => 'integer',
        'discount_cents' => 'integer',
        'total_cents'    => 'integer',
    ];

    public function items(): HasMany           { return $this->hasMany(TicketItem::class); }
    public function appointment(): BelongsTo   { return $this->belongsTo(Appointment::class); }
    public function barber(): BelongsTo        { return $this->belongsTo(Barber::class); }
    public function client(): BelongsTo        { return $this->belongsTo(User::class, 'client_id'); }
}

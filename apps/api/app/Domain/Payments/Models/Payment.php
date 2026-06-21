<?php

declare(strict_types=1);

namespace App\Domain\Payments\Models;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Identity\Models\User;
use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'client_id', 'appointment_id', 'purpose',
        'amount_cents', 'currency', 'provider', 'provider_charge_id',
        'status', 'meta',
    ];

    protected $casts = [
        'meta'         => 'array',
        'amount_cents' => 'integer',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }
}

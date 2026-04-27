<?php

declare(strict_types=1);

namespace App\Domain\Appointments\Models;

use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentStatusHistory extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'appointment_status_history';

    public $timestamps = false;

    protected $fillable = [
        'tenant_id', 'appointment_id', 'from_status', 'to_status', 'actor', 'context', 'created_at',
    ];

    protected $casts = [
        'context'    => 'array',
        'created_at' => 'datetime',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}

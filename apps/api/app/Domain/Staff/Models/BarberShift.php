<?php

declare(strict_types=1);

namespace App\Domain\Staff\Models;

use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BarberShift extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = ['tenant_id', 'barber_id', 'weekday', 'start_time', 'end_time'];

    protected $casts = ['weekday' => 'integer'];

    public function barber(): BelongsTo
    {
        return $this->belongsTo(Barber::class);
    }
}

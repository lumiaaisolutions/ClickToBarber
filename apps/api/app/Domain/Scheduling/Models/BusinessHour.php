<?php

declare(strict_types=1);

namespace App\Domain\Scheduling\Models;

use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BusinessHour extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'business_hours';

    protected $fillable = ['tenant_id', 'weekday', 'open_time', 'close_time', 'is_closed'];

    protected $casts = ['weekday' => 'integer', 'is_closed' => 'boolean'];
}

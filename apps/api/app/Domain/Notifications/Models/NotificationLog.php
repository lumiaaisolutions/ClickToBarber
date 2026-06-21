<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Models;

use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationLog extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'notifications_log';

    protected $fillable = [
        'tenant_id', 'user_id', 'appointment_id', 'channel', 'template',
        'to_address', 'status', 'payload', 'response', 'sent_at',
    ];

    protected $casts = ['sent_at' => 'datetime'];
}

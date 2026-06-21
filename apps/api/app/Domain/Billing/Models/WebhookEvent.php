<?php

declare(strict_types=1);

namespace App\Domain\Billing\Models;

use Illuminate\Database\Eloquent\Model;

class WebhookEvent extends Model
{
    protected $table = 'webhook_events';
    public $timestamps = false; // received_at + processed_at sirven en lugar de created/updated

    protected $fillable = [
        'provider', 'event_id', 'event_type', 'payload',
        'received_at', 'processed_at', 'status', 'error',
    ];

    protected function casts(): array
    {
        return [
            'payload'      => 'array',
            'received_at'  => 'datetime',
            'processed_at' => 'datetime',
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Domain\PointOfSale\Models;

use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketItem extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'ticket_id', 'item_type', 'item_id', 'item_name',
        'quantity', 'unit_price_cents', 'total_cents',
    ];

    protected $casts = [
        'quantity'         => 'integer',
        'unit_price_cents' => 'integer',
        'total_cents'      => 'integer',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }
}

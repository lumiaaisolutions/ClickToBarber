<?php

declare(strict_types=1);

namespace App\Domain\Billing\Models;

use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class CfdiInvoice extends Model
{
    use BelongsToTenant;

    protected $table = 'cfdi_invoices';

    protected $fillable = [
        'tenant_id', 'appointment_id',
        'rfc_emisor', 'rfc_receptor', 'uso_cfdi', 'uuid_sat',
        'subtotal_cents', 'iva_cents', 'total_cents',
        'status', 'xml_path', 'pdf_path', 'pac_response',
        'stamped_at',
    ];

    protected function casts(): array
    {
        return [
            'pac_response' => 'array',
            'stamped_at'   => 'datetime',
        ];
    }

    public const STATUS_DRAFT     = 'draft';
    public const STATUS_STAMPED   = 'stamped';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_FAILED    = 'failed';
}

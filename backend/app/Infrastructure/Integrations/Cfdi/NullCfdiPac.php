<?php

declare(strict_types=1);

namespace App\Infrastructure\Integrations\Cfdi;

use App\Domain\Billing\Contracts\CfdiPac;
use Illuminate\Support\Facades\Log;

/**
 * Driver default cuando no hay PAC configurado (CFDI_DRIVER=null).
 * Solo loguea — útil en dev y para tenants que no facturan.
 */
final class NullCfdiPac implements CfdiPac
{
    public function stamp(array $invoice): array
    {
        Log::info('[CFDI/NULL] stamp solicitado', ['rfc_receptor' => $invoice['rfc_receptor']]);
        return [
            'uuid_sat'   => null,
            'xml_path'   => null,
            'pdf_path'   => null,
            'stamped_at' => null,
            'raw'        => ['driver' => 'null', 'note' => 'Sin PAC configurado.'],
        ];
    }

    public function cancel(string $uuid, string $motivo, ?string $folioSustituto = null): array
    {
        Log::info('[CFDI/NULL] cancel solicitado', ['uuid' => $uuid]);
        return ['ok' => true, 'driver' => 'null'];
    }
}

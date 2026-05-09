<?php

declare(strict_types=1);

namespace App\Domain\Billing\Services;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Billing\Contracts\CfdiPac;
use App\Domain\Billing\Models\CfdiInvoice;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Genera y sella un CFDI 4.0 a partir de un Appointment completado.
 *
 *  - Lee RFC emisor + datos fiscales del Tenant.
 *  - Lee RFC receptor + datos del cliente (los mete vía request body por si
 *    el cliente público en general).
 *  - Construye 1 concepto = el servicio realizado (clave 90121501 corte
 *    de cabello / 90121500 estética genérico).
 *  - Persiste CfdiInvoice con uuid_sat + xml_path + status='stamped'.
 *
 * Si el PAC falla, persiste el registro con status='failed' y rethrow.
 */
final class EmitCfdiForAppointment
{
    public function __construct(private CfdiPac $pac) {}

    /**
     * @param array{
     *   rfc_receptor:string, nombre_receptor:string, codigo_postal_receptor:string,
     *   regimen_receptor:string, uso_cfdi:string,
     *   forma_pago?:string, metodo_pago?:string,
     * } $receptor
     */
    public function execute(int $appointmentId, array $receptor): CfdiInvoice
    {
        $appt = Appointment::query()->withoutGlobalScopes()
            ->with(['service', 'tenant'])
            ->findOrFail($appointmentId);

        $tenant = $appt->tenant;
        if (! $tenant instanceof Tenant) {
            throw new RuntimeException('Appointment sin tenant.');
        }

        $rfcEmisor = (string) ($tenant->rfc ?? env('CFDI_RFC_EMISOR', ''));
        if ($rfcEmisor === '') {
            throw new RuntimeException('Tenant sin RFC emisor configurado.');
        }

        $subtotalCents = (int) round($appt->price_cents / 1.16);
        $ivaCents = $appt->price_cents - $subtotalCents;

        $row = CfdiInvoice::create([
            'tenant_id'      => $tenant->id,
            'appointment_id' => $appt->id,
            'rfc_emisor'     => $rfcEmisor,
            'rfc_receptor'   => strtoupper($receptor['rfc_receptor']),
            'uso_cfdi'       => $receptor['uso_cfdi'],
            'subtotal_cents' => $subtotalCents,
            'iva_cents'      => $ivaCents,
            'total_cents'    => $appt->price_cents,
            'status'         => CfdiInvoice::STATUS_DRAFT,
        ]);

        try {
            $result = $this->pac->stamp([
                'rfc_emisor'             => $rfcEmisor,
                'nombre_emisor'          => $tenant->nombre_fiscal ?? $tenant->name,
                'regimen_emisor'         => $tenant->regimen_fiscal ?? '612',
                'rfc_receptor'           => $row->rfc_receptor,
                'nombre_receptor'        => $receptor['nombre_receptor'],
                'codigo_postal_receptor' => $receptor['codigo_postal_receptor'],
                'regimen_receptor'       => $receptor['regimen_receptor'],
                'uso_cfdi'               => $row->uso_cfdi,
                'lugar_expedicion'       => $tenant->codigo_postal ?? '00000',
                'forma_pago'             => $receptor['forma_pago'] ?? '04',
                'metodo_pago'            => $receptor['metodo_pago'] ?? 'PUE',
                'folio'                  => 'L' . $row->id,
                'fecha'                  => now()->format('Y-m-d\TH:i:s'),
                'subtotal_cents'         => $subtotalCents,
                'iva_cents'              => $ivaCents,
                'total_cents'            => $appt->price_cents,
                'conceptos'              => [[
                    'clave_prod_serv'      => '90121501',
                    'clave_unidad'         => 'E48',
                    'descripcion'          => $appt->service->name ?? 'Servicio',
                    'cantidad'             => 1,
                    'valor_unitario_cents' => $subtotalCents,
                ]],
            ]);

            $row->forceFill([
                'uuid_sat'     => $result['uuid_sat'],
                'xml_path'     => $result['xml_path'],
                'pdf_path'     => $result['pdf_path'],
                'pac_response' => $result['raw'] ?? null,
                'stamped_at'   => $result['stamped_at'],
                'status'       => $result['uuid_sat'] ? CfdiInvoice::STATUS_STAMPED : CfdiInvoice::STATUS_DRAFT,
            ])->save();
        } catch (\Throwable $e) {
            $row->forceFill([
                'status'       => CfdiInvoice::STATUS_FAILED,
                'pac_response' => ['error' => $e->getMessage()],
            ])->save();
            throw $e;
        }

        return $row;
    }
}

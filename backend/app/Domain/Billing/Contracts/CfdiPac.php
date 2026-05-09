<?php

declare(strict_types=1);

namespace App\Domain\Billing\Contracts;

/**
 * Contract para PAC (Proveedor Autorizado de Certificación) de CFDI 4.0 MX.
 *
 * Implementaciones esperadas:
 *  - FinkokCfdiPac
 *  - SwSapienCfdiPac
 *  - SolucionFactibleCfdiPac
 *  - NullCfdiPac (default si no hay credenciales — sólo guarda draft)
 */
interface CfdiPac
{
    /**
     * Sella el comprobante en el SAT y devuelve la información del UUID.
     *
     * @param array{
     *   rfc_emisor: string,
     *   rfc_receptor: string,
     *   uso_cfdi: string,
     *   conceptos: array<int,array{descripcion:string, cantidad:int, valor_unitario_cents:int}>,
     *   subtotal_cents: int,
     *   iva_cents: int,
     *   total_cents: int,
     * } $invoice
     *
     * @return array{
     *   uuid_sat: ?string,
     *   xml_path: ?string,
     *   pdf_path: ?string,
     *   stamped_at: ?\DateTimeInterface,
     *   raw: array<string,mixed>,
     * }
     */
    public function stamp(array $invoice): array;

    /**
     * Cancela un CFDI emitido. Algunos PAC requieren motivo y comprobante
     * sustituto.
     */
    public function cancel(string $uuid, string $motivo, ?string $folioSustituto = null): array;
}

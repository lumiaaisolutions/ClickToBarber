<?php

declare(strict_types=1);

namespace App\Infrastructure\Integrations\Cfdi;

use DOMDocument;
use DOMElement;

/**
 * Constructor de XML CFDI 4.0 (ingreso).
 *
 * Genera la estructura `cfdi:Comprobante` con un emisor, receptor y
 * conceptos. Calcula impuestos trasladados al 16% IVA por defecto.
 *
 * IMPORTANTE: el atributo `Sello` queda vacío. La firma se aplica
 * mediante {@see CfdiSealer::sealXml()} sobre el XML resultante.
 *
 * @phpstan-type CfdiInput array{
 *   rfc_emisor:string, nombre_emisor:string, regimen_emisor:string,
 *   rfc_receptor:string, nombre_receptor:string, codigo_postal_receptor:string,
 *   regimen_receptor:string, uso_cfdi:string,
 *   no_certificado:string, certificado_b64:string,
 *   lugar_expedicion:string, forma_pago:string, metodo_pago:string,
 *   folio:string, fecha:string,
 *   conceptos:array<int,array{
 *     clave_prod_serv:string, clave_unidad:string, descripcion:string,
 *     cantidad:float, valor_unitario_cents:int,
 *   }>
 * }
 */
final class CfdiXmlBuilder
{
    private const NS_CFDI = 'http://www.sat.gob.mx/cfd/4';
    private const TASA_IVA = '0.160000';

    /** @param CfdiInput $input */
    public function build(array $input): string
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->preserveWhiteSpace = false;
        $dom->formatOutput = false;

        $subTotalCents = 0;
        $impuestoCents = 0;
        $conceptos = [];
        foreach ($input['conceptos'] as $c) {
            $importe = (int) round($c['valor_unitario_cents'] * $c['cantidad']);
            $iva = (int) round($importe * 0.16);
            $subTotalCents += $importe;
            $impuestoCents += $iva;
            $conceptos[] = ['_in' => $c, 'importe' => $importe, 'iva' => $iva];
        }
        $totalCents = $subTotalCents + $impuestoCents;

        $comprobante = $dom->createElementNS(self::NS_CFDI, 'cfdi:Comprobante');
        $comprobante->setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $comprobante->setAttribute('xsi:schemaLocation', 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd');
        $comprobante->setAttribute('Version', '4.0');
        $comprobante->setAttribute('Folio', $input['folio']);
        $comprobante->setAttribute('Fecha', $input['fecha']);
        $comprobante->setAttribute('FormaPago', $input['forma_pago']);
        $comprobante->setAttribute('NoCertificado', $input['no_certificado']);
        $comprobante->setAttribute('Certificado', $input['certificado_b64']);
        $comprobante->setAttribute('Sello', ''); // se inyecta tras sellar
        $comprobante->setAttribute('SubTotal', self::pesos($subTotalCents));
        $comprobante->setAttribute('Moneda', 'MXN');
        $comprobante->setAttribute('Total', self::pesos($totalCents));
        $comprobante->setAttribute('TipoDeComprobante', 'I');
        $comprobante->setAttribute('Exportacion', '01');
        $comprobante->setAttribute('MetodoPago', $input['metodo_pago']);
        $comprobante->setAttribute('LugarExpedicion', $input['lugar_expedicion']);

        // Emisor
        $emisor = $dom->createElementNS(self::NS_CFDI, 'cfdi:Emisor');
        $emisor->setAttribute('Rfc', $input['rfc_emisor']);
        $emisor->setAttribute('Nombre', $input['nombre_emisor']);
        $emisor->setAttribute('RegimenFiscal', $input['regimen_emisor']);
        $comprobante->appendChild($emisor);

        // Receptor
        $receptor = $dom->createElementNS(self::NS_CFDI, 'cfdi:Receptor');
        $receptor->setAttribute('Rfc', $input['rfc_receptor']);
        $receptor->setAttribute('Nombre', $input['nombre_receptor']);
        $receptor->setAttribute('DomicilioFiscalReceptor', $input['codigo_postal_receptor']);
        $receptor->setAttribute('RegimenFiscalReceptor', $input['regimen_receptor']);
        $receptor->setAttribute('UsoCFDI', $input['uso_cfdi']);
        $comprobante->appendChild($receptor);

        // Conceptos
        $conceptosNode = $dom->createElementNS(self::NS_CFDI, 'cfdi:Conceptos');
        foreach ($conceptos as $c) {
            $concepto = $dom->createElementNS(self::NS_CFDI, 'cfdi:Concepto');
            $concepto->setAttribute('ClaveProdServ', $c['_in']['clave_prod_serv']);
            $concepto->setAttribute('Cantidad', (string) $c['_in']['cantidad']);
            $concepto->setAttribute('ClaveUnidad', $c['_in']['clave_unidad']);
            $concepto->setAttribute('Descripcion', $c['_in']['descripcion']);
            $concepto->setAttribute('ValorUnitario', self::pesos($c['_in']['valor_unitario_cents']));
            $concepto->setAttribute('Importe', self::pesos($c['importe']));
            $concepto->setAttribute('ObjetoImp', '02');

            $impC = $dom->createElementNS(self::NS_CFDI, 'cfdi:Impuestos');
            $traslados = $dom->createElementNS(self::NS_CFDI, 'cfdi:Traslados');
            $traslado = $dom->createElementNS(self::NS_CFDI, 'cfdi:Traslado');
            $traslado->setAttribute('Base', self::pesos($c['importe']));
            $traslado->setAttribute('Impuesto', '002');
            $traslado->setAttribute('TipoFactor', 'Tasa');
            $traslado->setAttribute('TasaOCuota', self::TASA_IVA);
            $traslado->setAttribute('Importe', self::pesos($c['iva']));
            $traslados->appendChild($traslado);
            $impC->appendChild($traslados);
            $concepto->appendChild($impC);

            $conceptosNode->appendChild($concepto);
        }
        $comprobante->appendChild($conceptosNode);

        // Impuestos totales
        $impuestos = $dom->createElementNS(self::NS_CFDI, 'cfdi:Impuestos');
        $impuestos->setAttribute('TotalImpuestosTrasladados', self::pesos($impuestoCents));
        $traslados = $dom->createElementNS(self::NS_CFDI, 'cfdi:Traslados');
        $traslado = $dom->createElementNS(self::NS_CFDI, 'cfdi:Traslado');
        $traslado->setAttribute('Base', self::pesos($subTotalCents));
        $traslado->setAttribute('Impuesto', '002');
        $traslado->setAttribute('TipoFactor', 'Tasa');
        $traslado->setAttribute('TasaOCuota', self::TASA_IVA);
        $traslado->setAttribute('Importe', self::pesos($impuestoCents));
        $traslados->appendChild($traslado);
        $impuestos->appendChild($traslados);
        $comprobante->appendChild($impuestos);

        $dom->appendChild($comprobante);

        return $dom->saveXML() ?: '';
    }

    private static function pesos(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }
}

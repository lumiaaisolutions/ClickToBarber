<?php

declare(strict_types=1);

namespace App\Infrastructure\Integrations\Cfdi;

use DOMDocument;
use RuntimeException;

/**
 * Sella un XML CFDI 4.0 con el CSD (Certificado de Sello Digital) del emisor.
 *
 *   1. Genera la "cadena original" (concatenación canónica de atributos)
 *      según el orden definido por el SAT — implementación simplificada,
 *      sin XSLT. Para 100% compliance hay que aplicar
 *      `cadenaoriginal_4_0.xslt` con `xsltproc`.
 *   2. Firma con RSA-SHA256 usando la llave privada (.key.pem).
 *   3. Inyecta el `Sello` base64 al atributo correspondiente.
 *
 * Las llaves se esperan en formato PEM (la .key del SAT viene en DER, hay
 * que convertirla con `openssl pkcs8 -inform DER ...`). Las rutas se leen
 * de `cfdi_csd.key_path` y `cfdi_csd.cer_path`. Si no existen se lanza
 * RuntimeException — el caller decide fallback.
 */
final class CfdiSealer
{
    public function __construct(
        private string $keyPemPath,
        private string $cerPemPath,
        private string $passphrase = '',
    ) {}

    public function sealXml(string $xml): string
    {
        if (! is_readable($this->keyPemPath)) {
            throw new RuntimeException("CSD key no legible: {$this->keyPemPath}");
        }
        if (! is_readable($this->cerPemPath)) {
            throw new RuntimeException("CSD cer no legible: {$this->cerPemPath}");
        }

        $dom = new DOMDocument();
        $dom->preserveWhiteSpace = false;
        $dom->loadXML($xml);
        $comprobante = $dom->documentElement;
        if (! $comprobante) throw new RuntimeException('XML sin root');

        $cadena = $this->buildCadenaOriginal($comprobante);
        $sello = $this->signRsaSha256($cadena);

        $comprobante->setAttribute('Sello', $sello);

        return $dom->saveXML() ?: '';
    }

    /**
     * Cadena original simplificada: concatena atributos en orden CFDI 4.0
     * separados por `|`, con `||` al inicio y al final.
     *
     * NOTA: implementación lineal, no aplica XSLT del SAT. Los PAC suelen
     * recomputar la cadena con el XSLT antes de sellar; algunos aceptan la
     * cadena "linealizada" como aquí. Si Finkok rechaza por sello inválido,
     * habría que aplicar el XSLT vía `xsltproc` o el extension `php-xsl`.
     */
    private function buildCadenaOriginal(\DOMElement $c): string
    {
        $a = fn (string $name): string => $this->cleanAttr($c->getAttribute($name));

        $parts = [
            $a('Version'),
            $a('Folio'),
            $a('Fecha'),
            $a('FormaPago'),
            $a('NoCertificado'),
            $a('SubTotal'),
            $a('Moneda'),
            $a('Total'),
            $a('TipoDeComprobante'),
            $a('Exportacion'),
            $a('MetodoPago'),
            $a('LugarExpedicion'),
        ];

        // Emisor
        $emisor = $c->getElementsByTagNameNS('http://www.sat.gob.mx/cfd/4', 'Emisor')->item(0);
        if ($emisor instanceof \DOMElement) {
            $parts[] = $this->cleanAttr($emisor->getAttribute('Rfc'));
            $parts[] = $this->cleanAttr($emisor->getAttribute('Nombre'));
            $parts[] = $this->cleanAttr($emisor->getAttribute('RegimenFiscal'));
        }
        $receptor = $c->getElementsByTagNameNS('http://www.sat.gob.mx/cfd/4', 'Receptor')->item(0);
        if ($receptor instanceof \DOMElement) {
            $parts[] = $this->cleanAttr($receptor->getAttribute('Rfc'));
            $parts[] = $this->cleanAttr($receptor->getAttribute('Nombre'));
            $parts[] = $this->cleanAttr($receptor->getAttribute('DomicilioFiscalReceptor'));
            $parts[] = $this->cleanAttr($receptor->getAttribute('RegimenFiscalReceptor'));
            $parts[] = $this->cleanAttr($receptor->getAttribute('UsoCFDI'));
        }

        // Conceptos
        $conceptos = $c->getElementsByTagNameNS('http://www.sat.gob.mx/cfd/4', 'Concepto');
        foreach ($conceptos as $concepto) {
            if (! $concepto instanceof \DOMElement) continue;
            $parts[] = $this->cleanAttr($concepto->getAttribute('ClaveProdServ'));
            $parts[] = $this->cleanAttr($concepto->getAttribute('Cantidad'));
            $parts[] = $this->cleanAttr($concepto->getAttribute('ClaveUnidad'));
            $parts[] = $this->cleanAttr($concepto->getAttribute('Descripcion'));
            $parts[] = $this->cleanAttr($concepto->getAttribute('ValorUnitario'));
            $parts[] = $this->cleanAttr($concepto->getAttribute('Importe'));
            $parts[] = $this->cleanAttr($concepto->getAttribute('ObjetoImp'));

            $traslados = $concepto->getElementsByTagNameNS('http://www.sat.gob.mx/cfd/4', 'Traslado');
            foreach ($traslados as $t) {
                if (! $t instanceof \DOMElement) continue;
                $parts[] = $this->cleanAttr($t->getAttribute('Base'));
                $parts[] = $this->cleanAttr($t->getAttribute('Impuesto'));
                $parts[] = $this->cleanAttr($t->getAttribute('TipoFactor'));
                $parts[] = $this->cleanAttr($t->getAttribute('TasaOCuota'));
                $parts[] = $this->cleanAttr($t->getAttribute('Importe'));
            }
        }

        return '||' . implode('|', array_filter($parts, fn ($p) => $p !== '')) . '||';
    }

    private function cleanAttr(string $v): string
    {
        // Compactación de espacios + trim según reglas SAT.
        return trim(preg_replace('/\s+/u', ' ', $v) ?? '');
    }

    private function signRsaSha256(string $data): string
    {
        $keyContent = file_get_contents($this->keyPemPath);
        $pk = openssl_pkey_get_private($keyContent ?: '', $this->passphrase);
        if ($pk === false) {
            throw new RuntimeException('No se pudo cargar la llave privada CSD: ' . openssl_error_string());
        }
        $signature = '';
        $ok = openssl_sign($data, $signature, $pk, OPENSSL_ALGO_SHA256);
        if (! $ok) {
            throw new RuntimeException('openssl_sign falló: ' . openssl_error_string());
        }
        return base64_encode($signature);
    }
}

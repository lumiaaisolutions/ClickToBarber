<?php

declare(strict_types=1);

namespace App\Infrastructure\Integrations\Cfdi;

use App\Domain\Billing\Contracts\CfdiPac;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * PAC Finkok — implementación funcional.
 *
 * Endpoints SOAP reales:
 *  - Stamp:  https://facturacion.finkok.com/servicios/soap/stamp.wsdl
 *  - Cancel: https://facturacion.finkok.com/servicios/soap/cancel.wsdl
 *
 * Flujo de stamp:
 *   1. {@see CfdiXmlBuilder} arma el XML CFDI 4.0.
 *   2. {@see CfdiSealer} computa cadena original + firma RSA-SHA256 con
 *      la CSD del emisor (rutas del tenant en config).
 *   3. POST SOAP `stamp` con XML base64.
 *   4. Persiste el XML resultante (ya con TFD) en disco.
 *
 * Activar con `CFDI_DRIVER=finkok` + creds en .env:
 *   CFDI_PAC_USER=<usuario_finkok>
 *   CFDI_PAC_PASS=<password_finkok>
 *   CFDI_CSD_KEY_PATH=/path/to/csd.key.pem  (.key del SAT convertido a PEM)
 *   CFDI_CSD_CER_PATH=/path/to/csd.cer.pem
 *   CFDI_CSD_PASSPHRASE=<password de la llave>
 *   CFDI_CSD_NO_CERTIFICADO=20001000000300022755 (20 dígitos del .cer)
 */
final class FinkokCfdiPac implements CfdiPac
{
    private const STAMP_ENDPOINT  = 'https://facturacion.finkok.com/servicios/soap/stamp';
    private const CANCEL_ENDPOINT = 'https://facturacion.finkok.com/servicios/soap/cancel';
    private const NS_APPS = 'apps.services.soap.core.views';

    public function stamp(array $invoice): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Finkok PAC sin credenciales — setea CFDI_PAC_USER/CFDI_PAC_PASS y CSD.');
        }

        $builder = new CfdiXmlBuilder();
        $sealer = new CfdiSealer(
            keyPemPath: (string) env('CFDI_CSD_KEY_PATH'),
            cerPemPath: (string) env('CFDI_CSD_CER_PATH'),
            passphrase: (string) env('CFDI_CSD_PASSPHRASE', ''),
        );

        $cer = trim(file_get_contents((string) env('CFDI_CSD_CER_PATH')) ?: '');
        $cerB64 = $this->cerPemToB64($cer);

        $unsignedXml = $builder->build([
            'rfc_emisor'             => $invoice['rfc_emisor'],
            'nombre_emisor'          => $invoice['nombre_emisor'] ?? 'EMISOR S.A. DE C.V.',
            'regimen_emisor'         => $invoice['regimen_emisor'] ?? '612',
            'rfc_receptor'           => $invoice['rfc_receptor'],
            'nombre_receptor'        => $invoice['nombre_receptor'] ?? 'PUBLICO EN GENERAL',
            'codigo_postal_receptor' => $invoice['codigo_postal_receptor'] ?? '00000',
            'regimen_receptor'       => $invoice['regimen_receptor'] ?? '616',
            'uso_cfdi'               => $invoice['uso_cfdi'],
            'no_certificado'         => (string) env('CFDI_CSD_NO_CERTIFICADO', ''),
            'certificado_b64'        => $cerB64,
            'lugar_expedicion'       => $invoice['lugar_expedicion'] ?? '00000',
            'forma_pago'             => $invoice['forma_pago'] ?? '04',
            'metodo_pago'            => $invoice['metodo_pago'] ?? 'PUE',
            'folio'                  => (string) ($invoice['folio'] ?? ('LUMIA-' . substr(md5(uniqid()), 0, 10))),
            'fecha'                  => (string) ($invoice['fecha'] ?? now()->format('Y-m-d\TH:i:s')),
            'conceptos'              => $invoice['conceptos'],
        ]);

        $signedXml = $sealer->sealXml($unsignedXml);
        $envelope = $this->buildSoapEnvelope($signedXml);

        Log::info('[CFDI/Finkok] sending stamp', [
            'rfc_emisor'   => $invoice['rfc_emisor'],
            'rfc_receptor' => $invoice['rfc_receptor'],
            'total_cents'  => $invoice['total_cents'] ?? null,
        ]);

        $response = Http::withHeaders([
            'Content-Type' => 'text/xml; charset=utf-8',
            'SOAPAction'   => '""',
        ])->withBody($envelope, 'text/xml')->post(self::STAMP_ENDPOINT);

        if ($response->failed()) {
            Log::error('[CFDI/Finkok] HTTP failed', ['body' => $response->body()]);
            throw new RuntimeException('Finkok HTTP ' . $response->status());
        }

        $parsed = $this->parseStampResponse($response->body());

        if (! $parsed['uuid']) {
            Log::warning('[CFDI/Finkok] sin UUID', ['body' => substr($response->body(), 0, 1000)]);
            throw new RuntimeException('Finkok no devolvió UUID: ' . ($parsed['error_msg'] ?? 'desconocido'));
        }

        // Persiste XML sellado.
        $folio = $invoice['folio'] ?? $parsed['uuid'];
        $disk = Storage::disk(env('CFDI_DISK', 'local'));
        $xmlPath = "cfdi/{$folio}.xml";
        $disk->put($xmlPath, $parsed['xml'] ?: $signedXml);

        return [
            'uuid_sat'   => $parsed['uuid'],
            'xml_path'   => $xmlPath,
            'pdf_path'   => null, // PDF generation a partir del XML sellado va en otra capa.
            'stamped_at' => now(),
            'raw'        => [
                'driver'   => 'finkok',
                'cod_estatus' => $parsed['cod_estatus'],
            ],
        ];
    }

    public function cancel(string $uuid, string $motivo, ?string $folioSustituto = null): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Finkok PAC sin credenciales.');
        }
        $user = (string) env('CFDI_PAC_USER');
        $pass = (string) env('CFDI_PAC_PASS');
        $rfc  = (string) env('CFDI_RFC_EMISOR');

        $envelope = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:apps="apps.services.soap.core.views">
<soap:Body>
<apps:cancel>
  <apps:UUIDS>
    <apps:UUID>
      <apps:UUID>{$uuid}</apps:UUID>
      <apps:Motivo>{$motivo}</apps:Motivo>
      <apps:FolioSustitucion>{$folioSustituto}</apps:FolioSustitucion>
    </apps:UUID>
  </apps:UUIDS>
  <apps:username>{$user}</apps:username>
  <apps:password>{$pass}</apps:password>
  <apps:taxpayer_id>{$rfc}</apps:taxpayer_id>
  <apps:cer>{$this->loadFile(env('CFDI_CSD_CER_PATH'))}</apps:cer>
  <apps:key>{$this->loadFile(env('CFDI_CSD_KEY_PATH'))}</apps:key>
  <apps:store_pending>false</apps:store_pending>
</apps:cancel>
</soap:Body>
</soap:Envelope>
XML;

        $response = Http::withHeaders([
            'Content-Type' => 'text/xml; charset=utf-8',
            'SOAPAction'   => '""',
        ])->withBody($envelope, 'text/xml')->post(self::CANCEL_ENDPOINT);

        return [
            'ok'       => $response->successful(),
            'driver'   => 'finkok',
            'response' => substr($response->body(), 0, 500),
        ];
    }

    private function buildSoapEnvelope(string $signedXml): string
    {
        $user = (string) env('CFDI_PAC_USER');
        $pass = (string) env('CFDI_PAC_PASS');
        $b64  = base64_encode($signedXml);
        return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:apps="apps.services.soap.core.views">
<soap:Body>
<apps:stamp>
  <apps:xml>{$b64}</apps:xml>
  <apps:username>{$user}</apps:username>
  <apps:password>{$pass}</apps:password>
</apps:stamp>
</soap:Body>
</soap:Envelope>
XML;
    }

    /**
     * @return array{uuid:?string, xml:?string, cod_estatus:?string, error_msg:?string}
     */
    private function parseStampResponse(string $body): array
    {
        $dom = new \DOMDocument();
        @$dom->loadXML($body);
        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('apps', self::NS_APPS);
        $xpath->registerNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');

        $uuid = $xpath->evaluate('string(//*[local-name()="UUID"])') ?: null;
        $xml  = $xpath->evaluate('string(//*[local-name()="xml"])')  ?: null;
        $cod  = $xpath->evaluate('string(//*[local-name()="CodEstatus"])') ?: null;
        $err  = $xpath->evaluate('string(//*[local-name()="Incidencia"]/*[local-name()="MensajeIncidencia"])') ?: null;

        return [
            'uuid'        => $uuid ?: null,
            'xml'         => $xml ?: null,
            'cod_estatus' => $cod ?: null,
            'error_msg'   => $err ?: null,
        ];
    }

    private function cerPemToB64(string $pem): string
    {
        $clean = preg_replace('/-----[^-]+-----|\s+/', '', $pem);
        return $clean ?: '';
    }

    private function loadFile(?string $path): string
    {
        if (! $path || ! is_readable($path)) return '';
        return base64_encode(file_get_contents($path) ?: '');
    }

    private function isConfigured(): bool
    {
        return (string) env('CFDI_PAC_USER', '') !== ''
            && (string) env('CFDI_PAC_PASS', '') !== ''
            && (string) env('CFDI_CSD_KEY_PATH', '') !== ''
            && (string) env('CFDI_CSD_CER_PATH', '') !== '';
    }
}

# CFDI 4.0 (México)

Emisión de comprobantes fiscales digitales por internet (CFDI) versión
4.0 a través de PAC (Proveedor Autorizado de Certificación). Driver
production-ready: **Finkok**.

## Componentes

| Archivo | Responsabilidad |
|---|---|
| `app/Domain/Billing/Contracts/CfdiPac.php` | Interface (`stamp` + `cancel`) |
| `app/Infrastructure/Integrations/Cfdi/CfdiXmlBuilder.php` | Genera XML 4.0 (Comprobante + Emisor + Receptor + Conceptos + Impuestos al 16%) |
| `app/Infrastructure/Integrations/Cfdi/CfdiSealer.php` | Cadena original simplificada + RSA-SHA256 con CSD |
| `app/Infrastructure/Integrations/Cfdi/FinkokCfdiPac.php` | SOAP + parse UUID + persistencia XML |
| `app/Infrastructure/Integrations/Cfdi/NullCfdiPac.php` | No-op para tenants que no facturan |
| `app/Domain/Billing/Models/CfdiInvoice.php` | Tabla `cfdi_invoices` con status |
| `app/Domain/Billing/Services/EmitCfdiForAppointment.php` | Orquesta build → seal → stamp → persist |
| `app/Http/Admin/Controllers/CfdiController.php` | Endpoints `/api/admin/cfdi[/...]` |

## Endpoints admin

| Método | Ruta | Descripción |
|---|---|---|
| GET  | `/api/admin/cfdi` | últimos 100 comprobantes del tenant |
| POST | `/api/admin/cfdi/{appointment}` | emite CFDI para esa cita |
| GET  | `/api/admin/cfdi/{id}/xml` | descarga XML sellado |

## Configuración (.env)

```bash
CFDI_DRIVER=finkok                                   # null | finkok
CFDI_PAC_USER=<usuario_finkok>
CFDI_PAC_PASS=<password_finkok>
CFDI_RFC_EMISOR=XAXX010101000                        # RFC del emisor
CFDI_CSD_KEY_PATH=/path/to/csd.key.pem               # llave privada en PEM
CFDI_CSD_CER_PATH=/path/to/csd.cer.pem               # certificado en PEM
CFDI_CSD_PASSPHRASE=<password de la llave>
CFDI_CSD_NO_CERTIFICADO=20001000000300022755         # 20 dígitos del .cer
CFDI_DISK=local                                      # disco para XML sellados
```

## Convertir CSD del SAT a PEM

El SAT entrega `.key` (DER binario) + `.cer` (DER binario):

```bash
# Llave privada DER → PEM
openssl pkcs8 -inform DER -in CSD_FOOBAR123.key -out csd.key.pem -passin pass:'TU_PASS'

# Certificado DER → PEM
openssl x509 -inform DER -in CSD_FOOBAR123.cer -out csd.cer.pem
```

## Flujo

1. Admin termina la cita → `Appointment.status = completed`.
2. Cliente pide factura → admin entra a la cita y completa el form
   con `rfc_receptor`, `nombre_receptor`, `codigo_postal_receptor`,
   `regimen_receptor`, `uso_cfdi`.
3. `POST /api/admin/cfdi/{appointment_id}` → `EmitCfdiForAppointment`:
   - `CfdiXmlBuilder.build()` arma XML con 1 concepto (servicio).
   - `CfdiSealer.sealXml()` calcula cadena original + firma con CSD.
   - `FinkokCfdiPac.stamp()` arma SOAP envelope, POST a Finkok,
     parsea UUID + CodEstatus, persiste XML sellado en disco.
   - `CfdiInvoice` queda con `status = stamped` + `uuid_sat`.
4. Cliente descarga XML desde `/api/admin/cfdi/{id}/xml`.

## Importante: cadena original

La implementación actual genera la cadena original **linealmente**
(concatena atributos por orden CFDI 4.0 con separador `|`). Algunos PAC
estrictos validan la cadena recomputándola con el XSLT oficial del SAT
(`cadenaoriginal_4_0.xslt`). Si Finkok rechaza por sello inválido,
agregar:

```bash
# Descargar el XSLT del SAT
curl -o backend/storage/sat/cadenaoriginal_4_0.xslt \
  https://www.sat.gob.mx/.../cadenaoriginal_4_0.xslt

# Aplicar con xsltproc desde PHP (extension xsl):
$xslt = new XSLTProcessor();
$xslt->importStyleSheet(...);
$cadena = $xslt->transformToXml($dom);
```

## Estado

✅ Builder + sealer + Finkok client funcionales.
✅ Endpoints admin + persistencia XML.
✅ Driver `null` para tenants sin facturación.
🔴 Generación de PDF (a partir del XML sellado, lib `dompdf`/`mPDF`).
🔴 XSLT oficial SAT bundlado para 100% compliance con PAC estrictos.
🔴 UI admin para emitir desde detalle de cita (endpoint listo).
🔴 Cancelación masiva por motivo + folio sustituto (método `cancel()` listo).

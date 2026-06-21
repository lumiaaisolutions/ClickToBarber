# POS — Point of Sale

## Estado

✅ Modelos + migraciones (incluye campos `payment_method` + `coupon_id` en `tickets`).
✅ Endpoint `POST /api/admin/pos/tickets` con flow completo.
✅ Cierre de caja `GET/POST /api/admin/cash-close`.
✅ UI `/admin/pos/checkout` con cart sticky + cupón + gift card + propina.
🟡 CFDI 4.0 stub (`NullCfdiPac` + `FinkokCfdiPac` skeleton — falta XML real).
🔴 Stripe Terminal para tarjeta física (hoy: marca `payment_method=card` sin reader).
🔴 PDF recibo descargable.
🔴 UI de cierre de caja (preview + form para `declared_cash_cents`).

## Tablas

- `tickets` — header de venta. Columnas: `barber_id`, `appointment_id?`,
  `subtotal_cents`, `discount_cents`, `tip_cents`, `total_cents`,
  `payment_method` (cash|card|transfer), `coupon_id?`, `closed_at`.
- `ticket_items` — `item_type` (service|product), `item_id`, `item_name`,
  `unit_price_cents`, `quantity`, `total_cents`.
- `cash_closes` — por (tenant_id, barber_id, date) UNIQUE. `gross_cents`,
  `cash_expected_cents`, `cash_declared_cents`, `variance_cents`,
  `commission_cents`, `tips_cents`, `notes`, `closed_by_user_id`.
- `payments` — registra cada cobro. `ticket_id?`, `appointment_id?`,
  `amount_cents`, `provider`, `purpose`, `status`, `paid_at`.
- `tip_splits` — distribución multi-barbero. `appointment_id?`,
  `barber_id`, `amount_cents`, `earned_on`.

## Flujo `POST /api/admin/pos/tickets`

```
{
  "barber_id": 3,
  "appointment_id": 42,            // opcional
  "items": [
    { "kind": "service", "id": 1, "qty": 1 },
    { "kind": "product", "id": 4, "qty": 2 }
  ],
  "coupon_code": "ELNAVA-XYZ",      // opcional
  "gift_card_code": "GIFT-AB12CD34", // opcional
  "payment_method": "cash",
  "tip_cents": 5000,
  "tip_split": [
    { "barber_id": 3, "amount_cents": 4000 },
    { "barber_id": 5, "amount_cents": 1000 }
  ]
}
```

Lo que hace en una sola transacción:

1. Suma `subtotal` desde servicios + productos del tenant.
2. Verifica stock de cada producto (422 `out_of_stock` si insuficiente).
3. Aplica cupón válido (vivo + no redimido). Calcula `discount_cents`
   (pct × subtotal o monto fijo).
4. Si gift card válida (`isUsable() = true`), aplica `redeem(remaining)` —
   el método del modelo descuenta del balance atómicamente y marca
   `redeemed_at` cuando llega a 0.
5. Calcula `total = subtotal - discount - gc_applied + tip`.
6. Crea `Ticket` + `TicketItem`s, decrementa `stock` y registra
   `StockMovement(type=sale)` por cada producto.
7. Marca cupón como `redeemed_at = now()`.
8. Inserta filas `tip_splits` (default 100% al barbero del ticket si no
   se pasa `tip_split`).
9. Crea `Payment` con `purpose=service_pos`, `provider=<payment_method>`,
   `status=succeeded`.
10. Si hay `appointment_id` y la cita no está completed, llama
    `CompleteAppointment::execute()` — esto a su vez dispara loyalty +
    rating token + sync Google Calendar.

Roles permitidos: `admin`, `manager`, `receptionist`, `platform_owner`.

## Cierre de caja

`GET /api/admin/cash-close?barber_id=X&date=Y` — preview computado:

```json
{
  "date": "2026-05-07",
  "barber": { "id": 3, "name": "Diego", "commission_pct": 50 },
  "tickets_count": 8,
  "gross_cents": 240000,
  "by_method": { "cash": 80000, "card": 160000 },
  "tips_cents": 12000,
  "commission_cents": 120000,
  "cash_expected_cents": 80000
}
```

`POST /api/admin/cash-close { barber_id, date, declared_cash_cents, notes }`
crea/actualiza la fila en `cash_closes` y devuelve `variance_cents`
(declared − expected).

## Comisiones

```
commission_per_barber = ticket.gross × barber.commission_pct / 100
```

Las propinas (`tip_splits`) NO entran en la comisión — se acumulan aparte.
Para liquidación quincenal: `cash_close.commission_cents +
sum(tip_splits.amount_cents WHERE earned_on BETWEEN ...)`.

## CFDI 4.0 MX

- Interface `App\Domain\Billing\Contracts\CfdiPac` con `stamp()` y `cancel()`.
- `NullCfdiPac` (default `CFDI_DRIVER=null`) — sólo loguea.
- `FinkokCfdiPac` — esqueleto HTTP-ready, falta generación XML real
  + sello CSD + parsing respuesta SOAP.
- Tabla `cfdi_invoices` ya existe con todos los campos (`uuid_sat`,
  `xml_path`, `pdf_path`, `pac_response`).

Variables `.env` cuando se active:

```
CFDI_DRIVER=finkok
CFDI_PAC_USER=...
CFDI_PAC_PASS=...
CFDI_RFC_EMISOR=...
CFDI_CSD_PATH=storage/csd/cer.pem      # certificado del tenant
CFDI_CSD_KEY_PATH=storage/csd/key.pem
CFDI_CSD_PASSWORD=...
CFDI_LUGAR_EXPEDICION=06140             # CP del local
```

Para producción se necesita:

1. Contrato firmado con un PAC (Finkok recomendado).
2. Certificado CSD activo del tenant emitido por SAT.
3. Implementar `FinkokCfdiPac::stamp()` con generación XML 4.0 + sello
   + envío SOAP. ~500 líneas adicionales.
4. Listener `BroadcastDomainEvent::handle()` que dispara CFDI cuando un
   `Ticket` se cierra y el tenant tiene CFDI activo.

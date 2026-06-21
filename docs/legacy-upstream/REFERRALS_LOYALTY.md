# Referidos + Loyalty

> Programa dual de retención implementado en `app/Domain/Growth/`.
> Tablas: `referrals`, `loyalty_programs`, `loyalty_visits`, `loyalty_rewards`.

## Loyalty

Cada N visitas completadas, el cliente recibe una recompensa automática
(porcentaje de descuento o servicio gratis).

### Modelo

- **`LoyaltyProgram`** (1 por tenant): config — `every_n_visits`,
  `reward_type` (`discount_pct` | `free_service`), `reward_value` (1-100),
  `expiry_days`.
- **`LoyaltyVisit`**: contador atómico. UNIQUE en `appointment_id` — la
  misma cita nunca acredita dos veces.
- **`LoyaltyReward`**: cada reward emitida. Código `RW-XXXXXX`,
  `issued_at`, `expires_at`, `redeemed_at`, `redeemed_appointment_id`.

### Flujo

1. Admin activa el programa en `/admin/loyalty` (toggle + config).
2. Cuando una cita pasa a `completed` → evento `AppointmentCompleted`.
3. Listener `HandleAppointmentCompleted` invoca
   `AwardLoyaltyVisit::execute($appointment)`:
   - Inserta `LoyaltyVisit` (idempotente).
   - Cuenta total de visitas del cliente en este tenant.
   - Si total % every_n_visits == 0 → crea `LoyaltyReward` con código
     único y vigencia `now() + expiry_days`.
4. Admin ve la recompensa en `/admin/loyalty` (lista + estado).
5. Cliente la redime mostrando el código en caja. Falta UI de canjeo
   automático (TODO: cuando esté el POS real conectado).

### Métricas exposed

`GET /api/admin/loyalty` devuelve:

```json
{
  "program": { ... },
  "kpis": {
    "rewards_active": 12,
    "rewards_redeemed": 47,
    "visits_credited": 380
  }
}
```

### Edge cases manejados

- **Cita cancelada después de marcarse completed**: `LoyaltyVisit` tiene
  `appointment_id UNIQUE`, así que si la cita se vuelve a marcar completed
  no genera doble crédito. Pero `cancelled` no acredita en primer lugar
  porque sólo `completed` dispara el evento.
- **Programa desactivado a mitad de mes**: visitas posteriores ya no
  acreditan, pero las recompensas ya emitidas siguen vigentes hasta su
  `expires_at`.

## Referrals

Sistema "trae a un amigo" con cupón único trazable.

### Modelo

- **`Referral`**: `referrer_user_id`, `referred_email` (opcional, para
  invitaciones cerradas), `code` (formato `BARB-XJ4Q`, único global),
  `status` (pending / signed_up / completed / expired),
  `reward_referrer_cents` y `reward_referred_cents` (defaults 15000/10000).

### Flujo

1. Admin emite código manual desde `/admin/referrals` (modal con
   `referrer_user_id` y opcional `referred_email`).
2. Recibe `share_url` formato `<frontend>/b/<slug>?ref=<code>`.
3. Cuando un nuevo usuario se crea con ese ref code (TODO: capturar el
   `?ref=` en el booking flow público y guardarlo en `Referral.referred_user_id`),
   pasa a `signed_up`.
4. Cuando el referido completa su primera cita, listener
   `HandleAppointmentCompleted` lo marca `completed` y emite las
   recompensas (TODO: integración con billing real para abonar crédito
   al referidor).

### Estados

- `pending` — emitido, sin uso.
- `signed_up` — el referido se registró.
- `completed` — referido completó primera cita.
- `expired` — pasó `expires_at` sin uso.

### KPIs

`GET /api/admin/referrals` devuelve `kpis.{pending,signed_up,completed}`.
Útil para dashboards de growth.

## Pendientes

- **Captura de `?ref=` en `/b/{slug}`**: el BookingFlow debería leer el
  query, guardarlo en una cookie de 30 días, y al crear el `User` cliente
  popular `Referral.referred_user_id`.
- **Crédito real al referidor**: hoy `reward_referrer_cents` queda como
  documentación. Cuando billing real esté online, emitir un crédito
  Stripe (`InvoiceItem` o `Coupon`) cuando `Referral.status` pase a
  `completed`.
- **WhatsApp template `referral_invite`**: para que el admin mande el
  código directamente desde la UI.

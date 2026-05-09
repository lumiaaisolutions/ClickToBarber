# Membresías

Programa pre-pago: el cliente paga $X/mes por adelantado y recibe N
servicios incluidos cada periodo. Aumenta MRR predecible y locking.

## Schemas

```
memberships                 -- catálogo del tenant
├─ id, tenant_id
├─ name (ej. "Plan Premium")
├─ price_cents, currency
├─ included_services_per_month
├─ eligible_service_ids (JSON, null = todos)
└─ is_active

client_memberships           -- suscripciones activas
├─ id, tenant_id
├─ user_id → users
├─ membership_id → memberships
├─ services_used_this_period
├─ current_period_starts_on, current_period_ends_on
├─ status: active | paused | canceled
└─ stripe_subscription_id    -- cobro recurrente real
```

## Flujo

1. Admin crea `Membership` desde `/admin/memberships` (UI pendiente).
2. Cliente desde su `/me` ve membresías disponibles → "Suscribirme".
3. Stripe Checkout en modo `subscription` con el price del plan.
4. Webhook `checkout.session.completed` crea `client_memberships` y
   setea `current_period_*`.
5. Cuando el cliente reserva una cita en un servicio elegible:
   - Si tiene membership activo y `services_used < included_per_month`:
     servicio es gratis (no se cobra depósito) — `services_used++`.
   - Si no, se cobra normal.
6. Renovación mensual: webhook `invoice.paid` resetea
   `services_used_this_period = 0` y avanza `current_period_*`.

## Edge cases

- **Cancelación a mitad de mes**: el cliente conserva los servicios
  hasta `current_period_ends_on`, luego no se renueva.
- **Pausa por viaje**: status `paused` evita el cobro pero no acredita
  servicios. Admin reactiva.
- **Mes con 5 fines de semana**: el plan da N servicios sin importar el
  número de semanas — periodo natural mensual.

## Endpoints públicos (cliente final)

Auth con el mismo `token` magic-link emitido por `ClientPortalController`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/public/me/memberships` | planes activos del tenant + membership actual |
| POST | `/api/public/me/memberships/checkout` | inicia Stripe Checkout subscription |

Mock driver crea `ClientMembership` inmediatamente; Stripe real lo crea
cuando llega `checkout.session.completed` con
`metadata.purpose=membership_subscription` (handler
`materializeMembershipFromSession`).

## Estado

✅ Migración + modelos.
✅ UI admin (`/admin/memberships`).
✅ UI cliente (`MembershipsSection` en `/me`).
✅ Wiring con `BookAppointment` (`deposit_status='covered'`).
✅ Stripe webhook `invoice.paid` resetea contador.

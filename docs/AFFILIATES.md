# Programa de afiliados (B2B)

Refiere otra barbería → comisión recurrente sobre el MRR del primer año.

## Schema

```
affiliates
├─ id, email, name
├─ code (único, formato AFF-XXXXXX)
├─ commission_pct (default 30)
├─ is_active
└─ timestamps

affiliate_referrals
├─ id, affiliate_id, tenant_id
├─ mrr_cents_at_signup
├─ total_commission_paid_cents
├─ signed_up_at
└─ timestamps
```

## Flujo

1. Persona se registra en `/affiliates/signup` (form: nombre + email)
   → `Affiliate` con `code` único `AFF-XXXXXX` + email con el código.
2. Comparte link `https://lumia.app/?aff=AFF-ABC123`.
3. Cuando un nuevo tenant se registra con ese parámetro, en
   `ProvisionTenantWithTrial` se busca el affiliate y se crea
   `affiliate_referrals` con `mrr_cents_at_signup = plan.price_cents`.
4. El affiliate entra a `/affiliates`, mete su código (persistido en
   `localStorage`), ve KPIs (referidos, MRR, comisión pagada) + tabla.
5. Click en "Conectar Stripe" → onboarding Express hospedado por
   Stripe → al volver, `stripe_payouts_enabled = true`.
6. Cada mes (1er día), `lumia:pay-affiliate-commissions` corre y para
   cada referral activo calcula `mrr × commission_pct / 100`:
   - Affiliate con Connect activo → `Transfer` automático y
     `last_paid_at = now()`.
   - Affiliate sin Connect → acumula en
     `total_commission_paid_cents` para pago manual posterior.
7. Tras 12 meses, deja de generar comisión (sólo primer año).

## Endpoints públicos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/public/affiliates/signup` | none (throttle:login) | crea o reutiliza affiliate, envía código por email |
| POST | `/api/public/affiliates/dashboard` | code | KPIs + tabla de referidos + share_url |
| POST | `/api/public/affiliates/connect/start` | code | devuelve URL de onboarding Stripe Express |
| POST | `/api/public/affiliates/connect/refresh` | code | re-lee `payouts_enabled` desde Stripe |

## Estado

✅ Migración + modelo `Affiliate` (+ `stripe_account_id`,
   `stripe_payouts_enabled`, `last_paid_at`).
✅ Captura `?aff=` en signup público.
✅ Frontend `/affiliates` + `/affiliates/signup`.
✅ Cron mensual `lumia:pay-affiliate-commissions`.
✅ Pago vía Stripe Connect Express (mock + real).

## Por qué primer año solo

Modelo industria estándar (Stripe partner program funciona así).
Incentiva referrals de alta calidad — el affiliate quiere tenants que
sobrevivan al primer año, no churn rápido.

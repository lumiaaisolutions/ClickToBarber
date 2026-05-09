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

1. Persona se registra como afiliada (futuro `/affiliates/signup`):
   email + nombre → `Affiliate` con `code` único.
2. Comparte link `https://lumia.app/?aff=AFF-ABC123`.
3. Cuando un nuevo tenant se registra con ese parámetro, en
   `ProvisionTenant` se busca el affiliate y se crea `affiliate_referrals`
   con `mrr_cents_at_signup = plan.price_cents`.
4. Cada mes, después de la `invoice.paid` del tenant, un job aparte
   calcula la comisión: `mrr × affiliate.commission_pct / 100` y la
   acumula en `total_commission_paid_cents`. Pago real al affiliate vía
   Stripe Connect / transferencia mensual (operación humana hasta tener
   volumen).
5. Tras 12 meses, deja de generar comisión (sólo primer año).

## Estado

✅ Migración + modelo `Affiliate`.
🔴 Captura `?aff=` en flujo de signup público.
🔴 UI dashboard del affiliate (link único, comisiones acumuladas).
🔴 Cron mensual de cálculo de comisiones.
🔴 Pago real (Stripe Connect Express).

## Por qué primer año solo

Modelo industria estándar (Stripe partner program funciona así).
Incentiva referrals de alta calidad — el affiliate quiere tenants que
sobrevivan al primer año, no churn rápido.

# Cupones

Tabla `coupons` (existía desde la primera migración) con CRUD admin.

## Schema

```
coupons
├─ id
├─ tenant_id
├─ campaign_id (opcional)
├─ client_id (opcional — cupón nominativo)
├─ code (único)
├─ discount_pct  (1-100, mutuamente exclusivo con discount_cents)
├─ discount_cents
├─ expires_at, redeemed_at
└─ timestamps
```

## Endpoints

- `GET    /api/admin/coupons`
- `POST   /api/admin/coupons` — uno solo
- `POST   /api/admin/coupons/bulk { count }` — hasta 500 a la vez
- `DELETE /api/admin/coupons/{id}`

## Generación de código

`{prefijo-del-slug}-{6-chars-random}`. Ejemplo: `ELNAVA-ABCDEF`. Único
global (no entre tenants — el campo `code` tiene `unique`).

## Aplicación al cobrar

Cuando se construye un Ticket POS (módulo en sprint), validar:

1. `expires_at > now()`.
2. `redeemed_at IS NULL` (single-use por código).
3. Calcular descuento: `pct` o `cents`, lo que sea más generoso para el
   cliente cuando ambos están seteados (no debería pasar por la regla
   `required_without`).

Al cobrar, marcar `redeemed_at = now()` y registrar la aplicación en el
`Ticket`.

## Estrategias de uso

- **Marketing retención**: bulk de 50 cupones 20% off, cada cliente
  inactivo recibe uno único trazable por WhatsApp.
- **Regalo de bienvenida**: cupón nominativo creado al onboarding del
  cliente con `client_id`.
- **Refer a friend**: el sistema genera el cupón automáticamente cuando
  el referral pasa a `signed_up`.

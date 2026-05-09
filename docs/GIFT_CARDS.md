# Gift cards

Cliente A compra una gift card de $X → cliente B recibe código por email.
B la canjea (parcial o total) en cualquier ticket del tenant.

## Schema

```
gift_cards
├─ id, tenant_id
├─ code (único, formato GIFT-XXXXXXXX)
├─ value_cents (valor original)
├─ balance_cents (lo que queda — se descuenta al canjear)
├─ currency
├─ purchaser_user_id → users
├─ recipient_email, recipient_name, message
├─ redeemed_at (cuando balance llega a 0)
├─ expires_at
└─ timestamps
```

## Flujo de compra

1. Cliente A entra a `/b/<slug>` y pulsa **Regalar**.
2. Form: monto (preset $300/$500/$1000 o custom), email/nombre del
   destinatario, mensaje.
3. Stripe Checkout one-time. Al éxito:
   - Crea `GiftCard` con `code`, `balance_cents = value_cents`,
     `expires_at = now() + 1 year`.
   - Manda email a `recipient_email` con el código.
4. Cliente B recibe email, llega al local, da el código.

## Flujo de canje

En el POS:
1. Admin escribe el código → `GET /api/admin/gift-cards/{code}` valida.
2. Si `isUsable() = true`, se aplica al `Ticket` el menor entre `balance`
   y total del ticket.
3. `GiftCard::redeem($amount)` resta del balance.
4. Si llega a 0, marca `redeemed_at`.

## Antifraude

- Código formato `GIFT-XXXXXXXX` (8 chars hex random) → 4.3 trillones de
  combinaciones, no se adivina.
- `expires_at` evita gift cards "infinitas".
- Audit log registra cada canje (admin que aplicó + ticket).

## Endpoints públicos

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/public/giftcards/{slug}/checkout` | crea sesión + (mock) GiftCard inmediato + email |
| GET  | `/api/public/giftcards/{slug}/{code}` | lookup público para success page |

## Branching driver

- **Mock** (`STRIPE_DRIVER=mock`): crea la GiftCard inmediatamente con
  balance completo y manda el email — útil para dev/demo sin keys reales.
- **Stripe real**: arma `checkout.sessions` modo `payment` con
  `metadata.purpose=gift_card`. El webhook
  `materializeGiftCardFromSession` crea la GiftCard + email **sólo
  cuando llega `checkout.session.completed`** (evita gift cards "fantasma"
  por checkouts abandonados).

## Estado

✅ Migración + modelo `GiftCard` con `redeem()` atómico.
✅ UI compra `/b/{slug}/gift` + success `/b/{slug}/gift/success`.
✅ UI canje en POS (`/admin/pos/checkout`).
✅ Stripe Checkout `payment` + webhook `materializeGiftCardFromSession`.
✅ Email transactional via `Mail::raw` (en prod conviene Mailable dedicado).

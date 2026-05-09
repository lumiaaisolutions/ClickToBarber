# Public API + Webhooks salientes

Para tenants Enterprise. Permite integraciones técnicas (CRM, ERP,
sistema contable propio). Spec OpenAPI en `docs/openapi.yaml`.

## API keys

Tabla `api_keys`. Token formato `lk_<8hex>_<40chars>`. Sólo el sha256
se persiste — el token plano se muestra **una sola vez** al emitir.

### Scopes

- `*` — full access (cuidado).
- `appointments:read`, `appointments:write`
- `ratings:read`
- `loyalty:read`
- `products:read`

Ampliable. La validación es exact-match contra `apikey:<scope>`.

### Endpoints `/api/v1/*`

Autenticados por API key. Hoy disponibles:

- `GET /api/v1/me` — info del tenant.
- `GET /api/v1/appointments` — últimas 100 citas. Requiere `appointments:read`.

Nuevos endpoints sin más burocracia: añadir a `routes/api.php` dentro
del grupo `apikey` y declarar el scope requerido.

### Endpoints admin para gestionar keys

- `GET /api/admin/platform/keys` — lista.
- `POST /api/admin/platform/keys { name, scopes[], expires_in_days? }`
- `POST /api/admin/platform/keys/{id}/revoke` — invalida.

## Webhooks salientes

Tabla `outbound_webhooks` (config) + `outbound_webhook_deliveries` (log).

### Cómo funciona

1. Admin registra URL + lista de events suscritos (`appointment.confirmed`, etc.) en `/admin/platform`.
2. Cuando un evento de dominio se dispara (Booked, Confirmed, Cancelled, Completed),
   `BroadcastDomainEvent` listener envía:

   ```
   POST {webhook.url}
   X-Lumia-Event: appointment.confirmed
   X-Lumia-Signature: sha256=<hex(HMAC_SHA256(body, secret))>
   Content-Type: application/json

   {
     "id": "<uuid del envío>",
     "type": "appointment.confirmed",
     "tenant_id": "...",
     "created_at": "2026-...",
     "data": { ... }
   }
   ```

3. Si la respuesta es 2xx → `last_success_at` actualizado, `consecutive_failures = 0`.
4. Si falla → `consecutive_failures++`. Tras 10 fallos seguidos, el
   webhook se marca `is_active = false` automáticamente.

### Cómo verificar en el receptor (pseudocódigo Node)

```js
const expected = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
const received = req.headers["x-lumia-signature"]?.replace(/^sha256=/, "");
if (received !== expected) return res.status(401).end();
```

### Eventos disponibles

- `appointment.booked`
- `appointment.confirmed`
- `appointment.cancelled`
- `appointment.completed`

(Más vendrán: `rating.submitted`, `subscription.updated`, etc.)

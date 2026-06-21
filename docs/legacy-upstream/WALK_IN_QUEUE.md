# Walk-in queue

Cliente sin cita previa entra escaneando QR físico en la barbería →
`<frontend>/q/<slug>` → se anota con nombre + WhatsApp opcional → recibe
posición y ETA.

## Schema

```
walk_in_queue
├─ id
├─ tenant_id
├─ client_name, client_phone (opcional)
├─ barber_id, service_id (opcional — null = "primer barbero libre")
├─ status: waiting | in_progress | served | abandoned
├─ estimated_minutes (cache, recalculado on demand)
├─ arrived_at, called_at, served_at
└─ timestamps
```

## Endpoints

### Públicos (sin auth, válidos por slug)
- `GET  /api/public/queue/{slug}` → estado + queue array
- `POST /api/public/queue/{slug}/join` → cliente se anota

### Admin (auth Sanctum)
- `GET  /api/admin/queue` — fila de hoy
- `POST /api/admin/queue/{id}/call` — pasa a `in_progress`
- `POST /api/admin/queue/{id}/serve` — marca `served`
- `POST /api/admin/queue/{id}/abandon` — marca `abandoned`

## Flujo UX

1. Cliente entra. QR sobre la pared → `/q/<slug>`.
2. Ve "5 personas esperando · ~150 min". Decide si vale la pena.
3. Pulsa **Anotarme**. Pone nombre + WhatsApp (opcional).
4. Recibe pantalla "Eres el #6, ETA 180 min". Refresca cada 30s.
5. Admin desde `/admin/walkin` ve la fila ordenada por `arrived_at`.
6. Cuando termina con un cliente, pulsa **Llamar** al siguiente
   (status → `in_progress`). Si tiene WhatsApp del cliente, podemos
   mandar push 5 min antes (TODO: cablear).
7. Termina → **Servir**. Si el cliente no aparece → **Abandonó**.

## ETA

Por simplicidad: `position × tenants.settings.walk_in_avg_minutes`
(default 30). Mejorable con el tiempo real de los últimos N walk-ins.

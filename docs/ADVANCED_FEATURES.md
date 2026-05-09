# Features avanzados (sesión 2026-05-07)

> Documenta los módulos añadidos en los bloques H-Q de la sesión 2026-05-07.
> Para features anteriores, ver el resto de `docs/`. Catálogo maestro:
> [`FEATURES.md`](./FEATURES.md).

## Walk-in queue

Cliente sin cita previa escanea QR físico de la barbería → llega a
`/q/{slug}` → se anota con nombre + WhatsApp opcional. Recibe posición y
ETA. Frontend refresca cada 30s.

- Tabla: `walk_in_queue`.
- Endpoints públicos: `GET/POST /api/public/queue/{slug}`.
- Admin: `GET/POST /api/admin/queue` con acciones `call/serve/abandon`.
- ETA: `walk_in_avg_minutes` (default 30) en `tenants.settings` × posición.

## Cita manual desde admin

`POST /api/admin/appointments` reusa `BookAppointment` para que el admin
agende clientes que llaman por teléfono o llegan walk-in y quieren cita
en el día. Source = `admin_manual` (vs `client_web` del flujo público).
Roles permitidos: admin, manager, receptionist.

## Cupones (CRUD)

`coupons` ya existía. Se añade controller con:

- `POST /api/admin/coupons` — emite uno con `discount_pct` o `discount_cents`.
- `POST /api/admin/coupons/bulk { count }` — emite N códigos únicos a la vez
  (útil para campañas de email blast).
- `DELETE /api/admin/coupons/{id}` — borrado (soft del modelo Eloquent
  estándar, no lo forzamos físico).

Códigos formato `BARB-XXXXXX` (prefijo derivado del slug). El descuento
real al cobrar lo aplica el POS (TODO: integración con `Ticket` cuando
se construya el flujo de checkout admin).

## Recurring appointments

Tabla `appointment_recurrences` con regla por cliente: frecuencia
(`weekly` / `biweekly` / `monthly`), weekday o day_of_month, hora local,
fecha inicio, opcionalmente fecha fin.

Job nightly `php artisan lumia:materialize-recurrences --days=21` crea
las citas concretas para los próximos N días. Idempotente: si el slot
ya está tomado (otra reserva o materialización previa), salta.

UI admin pendiente — los registros se crean por API hoy. Cuando el
módulo de Cliente final tenga "convertir esta cita en recurrente",
hacemos el form correspondiente.

## Mini portal del cliente final (`/me`)

El cliente final no tiene login con password. Pide acceso por email →
recibe magic link 30 min → entra a `/me?token=xxx`.

Lo que ve:

- Visitas acreditadas en loyalty.
- Recompensas activas (códigos para mostrar en caja).
- Su código de referido (si tiene uno pending).
- Historial de citas (próximas + completadas).
- **Botones GDPR**: descargar todos sus datos · eliminar cuenta (anonimiza).

Endpoints:

- `POST /api/public/me/login { email, tenant_slug }` — emite magic link.
- `POST /api/public/me/consume { token }` — devuelve el bundle.
- `POST /api/public/me/data-export { token }` — descarga JSON.
- `POST /api/public/me/data-deletion { token, confirm: "DELETE" }` —
  anonimiza al user.

## Captura de `?ref=` en BookingFlow

`BookAppointmentRequest` ahora valida `referral_code` opcional. Cuando
el cliente reserva con `?ref=BARB-XYZ` en la URL, `BookAppointment`
mapea ese código al `Referral` pending y le asigna `referred_user_id =
client_id`. Status pasa a `signed_up`. Cuando complete su primera cita,
el listener `HandleAppointmentCompleted` lo pasa a `completed`.

## Web Push real (VAPID)

`WebPushSigner` firma JWT ES256 con clave EC P-256.
`WebPushPayloadEncrypter` cifra el payload con AES-128-GCM siguiendo
RFC 8291 (aes128gcm). `SendPushNotification` orquesta y borra suscripciones
que reciben 410 Gone (browser las descarta).

Setup operativo:

1. Generar keypair: `php artisan lumia:generate-vapid` → guardar en
   gestor de secrets como `VAPID_PUBLIC_KEY` (base64url) y
   `VAPID_PRIVATE_KEY` (PEM EC).
2. Frontend usa la pubkey al suscribirse:
   `applicationServerKey: VAPID_PUBLIC_KEY` (decodificado de base64url).
3. Probar con `php artisan lumia:push-test {user_id}`.

Ver `docs/PWA_PUSH.md` para arquitectura completa.

## Anti-no-show real (los 4 jobs)

`BookAppointment` programa al crear:

- `SendReminder24h` con delay = starts_at − 24h.
- `SendReminder2hWithButtons` con delay = starts_at − 2h (incluye
  payloads `confirm:<id>` / `reschedule:<id>` / `cancel:<id>` que
  el webhook Meta procesa automáticamente).
- `AutoCancelUnconfirmedAppointment` con delay = starts_at − 1h. Lock
  distribuido en cache para no doble-cancelar entre workers; sólo
  cancela si sigue `pending_confirmation`; `forfeitDeposit=true`.

Todos los jobs son no-op si la cita ya cambió de estado.

## Calendar sync real (Google)

`SyncAppointmentToGoogle` job. Listener `DispatchGoogleSync` se suscribe
a Booked / Confirmed / Cancelled / Completed. El job:

- Refresh access_token si vencido.
- Upsert evento (idempotente vía `calendar_external_events.external_id`).
- Cancelado → `delete` en Google.

Sólo cablea fuera de testing (la queue sync de tests rompería
transacciones). En producción correrá al evento.

## Crons (scheduler)

`routes/console.php` define:

| Comando | Cron |
|---------|------|
| `lumia:enforce-dunning` | diario 03:00 |
| `lumia:reverify-domains` | diario 04:00 |
| `lumia:expire-referrals` | diario 04:30 |
| `lumia:purge-audit-logs` | semanal lunes 02:00 |
| `lumia:materialize-recurrences` | (TODO añadir) |

Activar con `php artisan schedule:work` (dev) o crontab del sistema:
`* * * * * php artisan schedule:run`.

## Public API + API keys

Para tenants Enterprise. Tabla `api_keys` con tokens `lk_xxx_yyy...`,
hash sha256 persistido. Middleware `apikey:scope` valida y inyecta
tenant. Endpoints `v1/*` viven detrás del middleware.

Endpoints admin:

- `GET /api/admin/platform/keys` — lista (sin token, sólo prefix).
- `POST /api/admin/platform/keys { name, scopes[], expires_in_days? }` —
  emite. **El token plano sólo se ve una vez** en la respuesta.
- `POST /api/admin/platform/keys/{id}/revoke` — invalida sin borrar.

API pública mínima ya disponible:

- `GET /api/v1/appointments` — scope `appointments:read`.
- `GET /api/v1/me` — info del tenant del key.

## Webhooks salientes

Tabla `outbound_webhooks` por tenant. Cada uno suscribe a una lista de
events (`appointment.confirmed`, `appointment.cancelled`, …). Listener
`BroadcastDomainEvent` los dispara con HMAC sha256 firmado en header
`X-Lumia-Signature`. Tabla `outbound_webhook_deliveries` registra cada
intento. Auto-desactivación tras 10 fallos consecutivos.

## Smart features

### Smart scheduling

`GET /api/admin/insights/smart-slots` agrega citas de las últimas 8
semanas y devuelve los slots (barber × weekday × hour) con MENOS
ocupación — los huecos donde el admin puede promover descuentos para
llenarlos.

### Stock predictivo

`GET /api/admin/insights/stock-forecast` calcula velocidad media de
salida (ventas/día en últimos 30 días) por producto y proyecta cuándo
se acaba el stock. Marca `reorder_now: true` si quedan ≤ 14 días.
Requiere `pos_inventory`.

### Galería de cortes

Tabla `cut_gallery` con `client_consent` flag y `expires_at` automático
+180 días si no es consentimiento permanente. UI / endpoint pendiente.

## Compliance

### Cookie consent banner

Componente cliente `CookieConsentBanner` en `app/layout.tsx`. Persiste
decisión en localStorage. Por defecto, sólo cookies estrictamente
necesarias.

### GDPR cliente final

Endpoints `data-export` / `data-deletion` accesibles desde `/me` con
magic link. La eliminación anonimiza el `User`: nombre y email a
`Cliente eliminado` / `deleted-{id}@anonymized.invalid`, phone/notes
a NULL. SoftDelete preserva referencias en audit_logs.

### PII access log

Tabla `pii_access_log` registra cada lectura de endpoints que devuelven
PII (`/api/admin/marketing/inactive`, `/api/admin/gdpr/*`). Implementación
del observer pendiente — la tabla y el modelo existen; falta cablear
en cada controller.

### 2FA enforcement por tenant

Columna `tenants.security` (JSON) con clave `require_2fa: true`. Cuando
un user de ese tenant intenta login sin 2FA configurado, se le redirige
a `/admin/security/2fa` antes de poder usar el portal. Implementación
en `AuthController` pendiente — el campo persiste y el frontend puede
leerlo.

### Password complexity

Hoy `min:6` en validation. Pendiente: añadir regla
`Password::min(10)->mixedCase()->numbers()->symbols()`.

## Infra prod

- `infra/backups/pg-backup.sh` — pg_dump diario + retención + S3 opcional.
- `infra/backups/pg-restore-test.sh` — test mensual de restore que
  compara conteo de tablas.
- `.github/renovate.json` — bot que abre PRs con dependency updates.
  Auto-merge para patch + minor. Vulnerabilidades = severity high → PR
  inmediato.
- `infra/observability/prometheus-alerts.yml` — 5 alert rules base.
- `infra/observability/grafana-dashboard.json` — dashboard JSON
  importable directamente en Grafana.
- `infra/observability/otel-collector.yaml` — config para correr OTel
  collector (Tempo + Prometheus + Loki).
- `next.config.ts` con `ANALYZE=1` activa bundle analyzer.

## Pendientes documentados

Lo que no se construyó en esta sesión y queda como follow-up:

- **UI calendario semanal** en `/admin/agenda` (hoy es lista por días).
- **Cmd+K búsqueda global** en el portal admin.
- **Página `/admin/clients/{id}`** con timeline visual del cliente.
- **Onboarding tutorial guiado** primera vez (Joyride-style).
- **Notificaciones in-app** dropdown bell icon.
- **`/admin/walkin`** UI completa (modelo + endpoints OK, falta UI).
- **`/admin/coupons`** UI (endpoints OK, falta UI).
- **`/admin/recurrences`** UI (endpoints OK, falta UI).
- **`/admin/insights`** UI (smart slots + stock forecast).
- **`/admin/platform`** UI (API keys + webhooks salientes).
- **`/admin/gallery`** UI (modelo OK, falta UI + upload S3).
- **CFDI 4.0 MX** (PAC integration — Finkok / SW Sapien) — feature grande
  por sí solo, ~1 semana.
- **Multi-idioma EN** con `next-intl` — feature grande.
- **App móvil del barbero** (React Native / Capacitor) — fuera de scope.
- **OpenTelemetry tracing** en backend Laravel (config collector ya está).
- **Storybook** de componentes UI premium.
- **Free trial 14d**: Subscription tiene `current_period_*` pero falta
  el flag `is_trial` y el flujo Stripe Checkout con `subscription_data.trial_period_days`.
- **POS real ticketing**: modelos `Ticket` y `TicketItem` existen, falta
  controller `CreateTicket`, UI POS para crear ticket mixto
  (servicios + productos), aplicar cupón, registrar pago.
- **Tip splitting UI** (modelo `tip_splits` existe).
- **Cierre de caja diario** UI (modelo `cash_closes` existe).

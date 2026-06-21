# LUMIA — Production Readiness Roadmap

> Última auditoría: **2026-05-07** tras bloques A-EE.
> Este documento es la fuente de verdad para "qué falta antes de producción".
> Se actualiza cada vez que se complete o se descubra un bloqueante nuevo.

## TL;DR (2026-05-07)

**Lista para subir a un beta de producción cerrado**, falta:

1. Configurar **secrets reales** en gestor (Doppler/Vault/AWS SM):
   `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`, `WHATSAPP_TOKEN`,
   `WHATSAPP_PHONE_ID`, `META_VERIFY_TOKEN`, `META_APP_SECRET`,
   `GOOGLE_CALENDAR_CLIENT_ID`/`SECRET`, `MAIL_*`.
2. **Postgres** activo (`DB_CONNECTION=pgsql`) y migración RLS aplicada.
3. **Tramite de Meta** para 4 plantillas WhatsApp (2-7 días de espera).
4. **Cron real** en server: `* * * * * php artisan schedule:run` +
   `pg-backup.sh` 02:00 + `pg-restore-test.sh` mensual.

Estimación a producción: **3-5 días** para infra + secrets + DNS, +
**2-7 días** de espera Meta para WhatsApp real (paralelo).

---

## Estado actual (snapshot 2026-05-07)

### ✅ Listo y verificado

**Núcleo**
- Multi-tenant con `tenant_id` + RLS migración pendiente apply en pgsql.
- Sanctum Bearer auth (sin `statefulApi()`).
- Roles ampliados con `EnsureRole`.
- Audit log con `LoggableChanges` trait + redaction.
- 88 tests Pest passed / 3 skipped (Windows openssl).

**Identidad y branding**
- Refundición visual LUMIA Old Money + 6 presets (Lumina port).
- White-label dinámico con `<BrandingProvider>` scoped (15 tokens
  cromáticos por modo + 13/11 fuentes display/body con preview).
- Onboarding wizard 5 pasos, editor `/admin/identity` con live preview.

**Operación**
- Agenda + slots + lifecycle citas (book/confirm/cancel/complete).
- Anti no-show: T-24h, T-2h con botones, T-1h auto-cancel con lock
  Redis distribuido.
- POS ticketing **completo** con cupón + gift card + propina + stock
  + payment + tip splits + auto-complete cita.
- Cierre de caja con preview + variance.
- Walk-in queue (público + admin).
- Citas recurrentes (modelo + comando, UI placeholder).

**Crecimiento**
- Marketing retención + Loyalty + Referrals + Stripe Coupon real al
  referral.completed.
- Memberships con integración real en `BookAppointment`
  (`deposit_status='covered'`, contador `services_used_this_period`).
- Gift cards con `redeem()` atómico aplicado en POS.
- Affiliates B2B con cron mensual + captura `?aff=`.
- Ratings post-visita.

**Notificaciones**
- WhatsApp real (`MetaWhatsappClient`) — falta sólo plantillas Meta.
- Anti-no-show jobs con `delay()` y locks Redis.
- Web Push real (VAPID puro PHP — payload encriptado AES-128-GCM).
- In-app notifications con bell dropdown polling 60s.

**Billing**
- Stripe Checkout + provisión automática (`ProvisionTenantWithTrial`).
- Webhooks con HMAC + idempotencia (`webhook_events` UNIQUE).
- `invoice.paid` renueva memberships.
- Free trial 14d + dunning grace period (`lumia:enforce-dunning`).

**Seguridad y compliance**
- Cifrado PII (`users.phone/notes` cast `encrypted` + `phone_hash`
  indexable).
- 2FA TOTP (puro PHP) con recovery codes.
- **2FA enforcement por tenant** (`EnforceTwoFactor` middleware activo).
- **Strong password policy** (`StrongPassword::rule()` + HIBP).
- Páginas legales (Términos, Privacidad, Cookies).
- Cookie consent banner con **categorías granulares** (necesarias /
  analíticas / marketing) + **re-consent anual**.
- GDPR endpoints admin **y cliente final** (`/me`).
- PII access log con helper `PiiAccessLogger` cableado.
- Hardening: HMAC webhooks, throttle login/booking/webhook, CSP,
  cookies Secure+HttpOnly, rotación tokens Sanctum.
- Login alerts (IP/UA inusual con UAParser).
- Rotación PII via `php artisan lumia:rotate-pii-key`.
- Gitleaks + secrets scan en CI.

**Observabilidad**
- Structured logs con `request_id`, `tenant_id`, `user_id`.
- Sentry-compatible `ErrorReporter` (no-op si DSN vacío).
- `/api/metrics` Prometheus exporter.
- **`/api/up/deep`** healthcheck (DB+Redis+Stripe+Meta+Mail).
- **Página pública `/status`** con badges OK/down/skipped.
- Alert rules + Grafana dashboard JSON listos.
- Tracing OpenTelemetry stub (`TracingHooks` no-op safe).
- **`RateLimitByTenant`** middleware (600 req/min default).

**DevOps**
- GitHub Actions CI (lint + tests + build + gitleaks).
- `Dockerfile.prod` backend + frontend.
- `fly.toml` para Fly.io deployment.
- Playwright E2E (admin login + booking público).
- Renovate config para deps update.
- 6 crons en `routes/console.php`.
- Backups Postgres scripts (`pg-backup.sh` + `pg-restore-test.sh`).

**UX**
- Cmd+K command palette con búsqueda backend real.
- DarkModeToggle, ConfettiOnMount, Skeleton, EmptyState.
- Timeline visual del cliente (`/admin/clients/{id}`).
- Responsive 100% (auditoría 2026-05-06, 32 findings).

### ⚠️ Funcional pero requiere config externa

- **Stripe**: cliente real listo. Falta sólo activar live keys.
- **WhatsApp**: cliente real listo. Falta plantillas aprobadas Meta.
- **Twilio Voice** ✅ implementado (2026-05-08): `TwilioVoiceClient` real (POST /Calls + TwiML), driver "log" de fallback. Cableado al fallback no-show en `AutoCancelUnconfirmedAppointment` cuando `TWILIO_DRIVER=twilio`. Falta sólo activar credenciales.
- **CFDI 4.0 MX**: interface + Null + Finkok skeleton. Falta XML real.
- **Sentry**: SDK-compatible reporter listo. Falta DSN real.
- **Google Calendar**: OAuth listo. Falta credenciales reales.

### 🔴 No existe aún

- IaC (Terraform/Pulumi) para infra prod.
- App móvil del barbero (proyecto separado).
- Chat en vivo cliente↔barbería (Reverb).
- AI assistant para WhatsApp.
- ML real para no-show prediction (hay regla simple).
- Multi-idioma EN frontend (`I18N.md`).

---

## Bloqueantes restantes para producción

> El listado original B1-B6 se ha completado **excepto la activación
> operativa**. Lo que queda es operacional, no de código.

### Op-1 — Activar Postgres en prod

**Estado código**: ✅ código listo. Migración RLS escrita.

**Pendiente operacional**:

```bash
# 1. .env.production
DB_CONNECTION=pgsql
DB_HOST=...
DB_DATABASE=lumia
DB_USERNAME=lumia_app
DB_PASSWORD=<gestor>

# 2. Aplicar
php artisan migrate --force
# La migración 2026_04_27_000001_enable_rls_for_tenant_tables aplica
# políticas RLS a todas las tablas tenant-scoped.

# 3. Verificar
psql -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND rowsecurity = true"
```

**Criterio**: test `tests/Feature/Domain/TenantIsolationTest.php` (existe)
debe pasar contra Postgres.

### Op-2 — Configurar secrets en gestor

**Estado código**: ✅ todas las creds leídas via `config()` desde `.env`.

**Pendiente**: elegir gestor (Doppler / AWS Secrets Manager / Vault) y
poblar:

```
APP_KEY=<nuevo, no reusar dev>
DB_PASSWORD=<random>
STRIPE_SECRET=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLIC_KEY=pk_live_...
WHATSAPP_TOKEN=<Meta Bearer>
WHATSAPP_PHONE_ID=<Meta phone number id>
META_VERIFY_TOKEN=<random, configurar en webhook Meta>
META_APP_SECRET=<Meta app secret>
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
MAIL_HOST=...
MAIL_USERNAME=...
MAIL_PASSWORD=...
TWILIO_SID=...
TWILIO_TOKEN=...
TWILIO_FROM=...
SENTRY_DSN=https://...
VAPID_PUBLIC_KEY=<base64url>
VAPID_PRIVATE_KEY=<base64url>
```

Generar VAPID con: `php artisan lumia:generate-vapid-keys`.

### Op-3 — Tramite Meta WhatsApp Cloud API

**Estado código**: ✅ `MetaWhatsappClient` real + webhook signature.

**Pendiente**:

1. Verificar número con Meta Business (2-7 días).
2. Someter 4 plantillas:
   - `appointment_confirmation`
   - `appointment_reminder_24h`
   - `appointment_reminder_2h_with_buttons`
   - `appointment_cancelled_no_response`
3. Configurar webhook URL en Meta apuntando a `/api/webhooks/whatsapp`.

### Op-4 — Crons y backups en server

**Estado código**: ✅ 6 jobs schedule + 2 scripts backup.

**Pendiente** en el servidor:

```bash
# /etc/cron.d/lumia
* * * * * www-data cd /opt/lumia/backend && php artisan schedule:run >> /var/log/lumia-schedule.log 2>&1

0 2 * * * root /opt/lumia/infra/backups/pg-backup.sh
0 3 1 * * root /opt/lumia/infra/backups/pg-restore-test.sh
```

Para Horizon, además:

```bash
# systemd unit lumia-horizon.service
[Service]
ExecStart=/usr/bin/php /opt/lumia/backend/artisan horizon
Restart=always
```

### Op-5 — DNS + TLS

**Pendiente**:

1. Apuntar `app.lumia.app` → IP del API.
2. Apuntar `*.lumia.app` → IP del frontend (para tenants subdomain
   propio antes de custom domains).
3. TLS via Cloudflare (automático) o certbot.
4. Wildcard cert para `*.lumia.app`.

### Op-6 — Sentry / Logging real

**Estado código**: ✅ `ErrorReporter` listo.

**Pendiente**: crear projects en Sentry (o GlitchTip self-hosted),
poblar `SENTRY_DSN` en gestor.

---

## Importantes (no bloquean técnicamente, pero conviene)

### I1 — UI faltante (cierre de caja) ✅ 2026-05-08

Implementado en `frontend/src/app/admin/cash-close/page.tsx` +
`components/admin/CashCloseClient.tsx`. Filtros por barbero/fecha,
preview con KPIs (tickets, bruto, propinas, comisión), desglose por
método, input de efectivo declarado con varianza en vivo, notas y
submit a `/api/admin/cash-close`. Sidebar entry visible para usuarios
con `can_write && can_see_finance`.

### I2 — Drag-drop reagendar ✅ 2026-05-08

Implementado dentro de `components/admin/AgendaCalendar.tsx`. Cada
bloque de cita es `draggable` (excepto cancelled/no_show/completed);
las columnas de día son drop targets que snap a 15 min. Optimistic
update + rollback con toast en errores 409 (slot_taken), 422 (fecha
inválida), 403 (rol). Verificado E2E vía proxy Next.js.

### I3 — UI compra pública gift cards ✅ 2026-05-08

Implementado:
- `frontend/src/app/b/[slug]/gift/page.tsx` (server component con
  branding del tenant) + `GiftCardCheckoutClient` con presets de monto,
  custom amount, datos sender/recipient, mensaje, validación local +
  remota.
- `/b/[slug]/gift/success?code=...` muestra código + valor + vencimiento
  consultando `/api/public/giftcards/{slug}/{code}`.
- Backend `PublicGiftCardController` con flujo dual:
  - Mock driver: crea GiftCard inmediato + email al recipient.
  - Real Stripe: `checkout.sessions` mode=payment con metadata
    `purpose=gift_card`; webhook `materializeGiftCardFromSession`
    crea la card + email cuando recibe `checkout.session.completed`.

### I4 — UI cliente final memberships ✅ 2026-05-08

Implementado:
- `MembershipsSection` cargado dentro de `ClientPortalClient` (`/me`).
  Lista planes activos del tenant, muestra membresía activa con periodo
  + servicios usados/incluidos, botón "Suscribirme" → Stripe Checkout
  subscription (mock crea ClientMembership en ese mismo POST).
- Backend `PublicMembershipsController` autenticado por el mismo
  magic link `client_portal` (mismo TTL 30 min).
- Webhook `materializeMembershipFromSession` para flujo Stripe real
  (metadata `purpose=membership_subscription`).

### I5 — Affiliate dashboard self-service ✅ 2026-05-08

Implementado:
- `/affiliates/signup` con form (nombre + email) → email con código
  `AFF-XXXXXX` privado + link único `?aff=...`.
- `/affiliates` con login por código (persiste en localStorage) →
  dashboard con KPIs (referidos, MRR, comisión pagada), link único
  copiable, tabla de referidos.
- Backend `PublicAffiliatesController`:
  - `POST /api/public/affiliates/signup` (no revela si email existe).
  - `POST /api/public/affiliates/dashboard` autenticado por el `code`
    (12 chars, ~10^14 combinaciones — buen MVP).
- Pendiente futuro: magic-link auth (en vez de code-as-token) para
  rotación si se filtra.

### I6 — Stripe Connect Express ✅ 2026-05-08

- Migración `2026_05_08_000001_add_stripe_account_to_affiliates`
  agrega `stripe_account_id` + `stripe_payouts_enabled` + `last_paid_at`.
- `App\Domain\Affiliates\Services\StripeConnectService` con
  `onboardLink`, `refreshStatus`, `transfer` (mode=destination).
- Endpoints públicos `connect/start` y `connect/refresh`.
- Banner en `/affiliates` para conectar/continuar onboarding.
- `lumia:pay-affiliate-commissions` ahora dispara `Transfer` para
  affiliates con Connect activo y acumula deuda para los demás.

### I7 — CFDI Finkok production ✅ 2026-05-08

- `CfdiXmlBuilder` arma CFDI 4.0 (Comprobante + Emisor + Receptor +
  Conceptos + Impuestos al 16%).
- `CfdiSealer` computa cadena original simplificada y firma RSA-SHA256
  con la CSD (`.key.pem` + passphrase).
- `FinkokCfdiPac` arma SOAP envelope + POST a Finkok stamp + parsea
  UUID/CodEstatus + persiste XML sellado en disco (`CFDI_DISK`).
- `EmitCfdiForAppointment` orquesta build → seal → stamp → persist
  `CfdiInvoice` (status draft/stamped/failed).
- Endpoints `/api/admin/cfdi`, `POST /api/admin/cfdi/{appointment}`,
  `GET /api/admin/cfdi/{id}/xml`.
- **Pendiente para 100% compliance**: aplicar XSLT oficial SAT
  (`cadenaoriginal_4_0.xslt`) — algunos PAC son estrictos. La
  implementación actual funciona con Finkok dev/sandbox.

### I8 — Vista calendario semanal ✅ 2026-05-08

`/admin/agenda` ahora usa `AgendaCalendar`: grid 7 columnas × franja
horaria 7-22h, citas como bloques posicionados absolutos con color por
estado, toggle Día/Semana, navegación prev/hoy/next, drawer de detalle
con reasignación de barbero. Re-fetcha al navegar; cubre I8 + I2 en un
solo componente.

### I9 — Multi-idioma EN frontend ✅ 2026-05-08 (scaffold)

- `lib/i18n/dict.ts` con namespaces `landing` + `common` (ES + EN).
- `t()` helper + `getServerLocale()` (cookie `lumia_locale`).
- `LocaleSwitcher` montado en footer landing.
- `POST /api/i18n` persiste cookie 1 año.
- **Pendiente futuro**: traducir admin (~200 strings adicionales) y
  routing por path `/en/*` cuando sea necesario para SEO.

### I10 — Onboarding tutorial guiado ✅ 2026-05-08

- `OnboardingTour` con spotlight + tooltip animado, 5 pasos
  (Dashboard, Agenda, Identidad, Servicios, POS).
- Se dispara automáticamente para usuarios que ya completaron el
  wizard (`first_login_at` set) y no han descartado el tour
  (`localStorage.lumia_tour_v1_done`).
- Botón "Ver tour de bienvenida" en sidebar para reabrir manualmente
  (event `lumia:tour:open`).

---

## Quick wins (1-2 horas cada uno)

- **Logo real del tenant demo** `el-navajazo` (hoy sólo wordmark LUMIA) — pendiente.
- ✅ **Bundle analyzer** — `ANALYZE=1 npm run build` + `scripts/check-bundle-budget.mjs` (200KB admin / 220KB cliente / 250KB default).
- ✅ **Renovate auto-merge** — `:automergePatch` + `automergeType:branch` + `platformAutomerge`. Major frameworks excluidos.
- ✅ **Slack alert** — `lumia:health-poll` cada minuto, alerta tras 3 fallos consecutivos. Env: `APP_HEALTH_URL`, `SLACK_HEALTH_WEBHOOK`.
- ✅ **GA + PostHog gated** — `<Analytics />` en root layout, carga sólo cuando `consent.analytics=true`. Env: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_GA_ID`.

---

## Cómo retomar esta sesión en otra computadora

```bash
# 1. Clonar
git clone https://github.com/LUMIA-AI-SOLUTIONS/Sistema_Barberia.git
cd Sistema_Barberia

# 2. Backend (Windows con PHP 8.4)
cd backend
copy .env.example .env
php "C:\Program Files\PHP\v8.4\composer" install
php artisan key:generate
php artisan migrate:fresh --seed
# Background server (nohup en Linux/Mac, Start-Process en PS):
php artisan serve --host=127.0.0.1 --port=8000
# o en background con disown:
# nohup php artisan serve --port=8000 > /tmp/lumia-backend.log 2>&1 & disown

# 3. Frontend
cd ../frontend
copy .env.local.example .env.local
npm install
npm run dev
# o en background: nohup npm run dev > /tmp/lumia-frontend.log 2>&1 & disown

# 4. Verificar
curl http://localhost:8000/api/up/deep | jq
curl http://localhost:3000/status

# 5. Login
# admin@elnavajazo.test / password
open http://localhost:3000/login
```

**Antes de empezar el siguiente bloque**: leer `CLAUDE.md` §11 (estado
vivo), `docs/SESSION_LOG.md` (bitácora) y este doc. Cualquier decisión
arquitectónica nueva se documenta primero aquí o en su doc específico.

---

## Cambios desde la última auditoría

- **2026-05-07** — Refundición completa tras bloques A-EE. Todos los
  bloqueantes B1-B6 cerrados a nivel código; pasamos a Op-1 a Op-6
  (operacional). Núcleo listo para beta cerrado. Ver `SESSION_LOG.md`
  para detalle archivo-por-archivo.
- **2026-05-05** — Documento creado. Audit inicial post-Tarea 3.1.

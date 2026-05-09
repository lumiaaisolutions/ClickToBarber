# Proyecto: LUMIA — Software de barbería con identidad propia

> Documento maestro de contexto para Claude Code. Se carga automáticamente
> en cada sesión y define visión, stack, reglas de negocio críticas y
> apuntadores a la documentación específica.
>
> Detalle por feature → `docs/<NOMBRE>.md`. Bitácora histórica de
> sesiones → `docs/SESSION_LOG.md`. Catálogo completo de features →
> `docs/FEATURES.md`. Producción → `docs/PRODUCTION_READINESS.md`.

---

## 1. Visión

**LUMIA** es una plataforma SaaS multi-tenant para barberías premium
(modelo Freemium / Suscripción escalonada). Todas las funcionalidades son
visibles en la UI; las premium aparecen bloqueadas con un candado para
maximizar conversión. Cada barbería tiene **white-label nativo** —
identidad visual propia que se aplica sólo a `/admin/*` y al link público
`/b/{slug}`. La landing pública conserva la identidad LUMIA.

### Portales

1. **Admin** — dueño/gerente. Configuración, agenda global, finanzas, marketing.
2. **Cliente** — usuario final. Reserva, paga depósito, califica.

### Diferenciadores

- **Anti no-show con Circuit Breaker conversacional**: confirmación
  WhatsApp T-2h con botones; sin respuesta T-1h → cancelación automática
  + retención de depósito + llamada Twilio como fallback.
- **Marketing de retención automatizado** + programa de loyalty + referidos.
- **Multi-tenant nativo** con Row Level Security en PostgreSQL.
- **2FA TOTP, audit log, custom domains, PWA, ratings post-visita**.
- **Experiencia "Pro Max"**: zero lag a 60 FPS, scrollytelling, SPA con
  transiciones cinematográficas.

---

## 2. Stack

### Backend (`backend/`)

| Capa | Tecnología |
|------|-----------|
| Lenguaje | Laravel 11+ (PHP 8.3+) |
| Arquitectura | DDD + Screaming Architecture |
| Base | PostgreSQL 16 (RLS) en prod, SQLite en dev |
| Cache / queues / breakers | Redis 7 |
| Autenticación | Laravel Sanctum (Bearer tokens) + 2FA TOTP propio |
| Workers | Laravel Horizon |

### Frontend (`frontend/`)

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, RSC) |
| UI | React 19 + Tailwind 4 + CSS Modules |
| Estado | Zustand (cliente) + TanStack Query (servidor) |
| Animación | Framer Motion + GSAP/ScrollTrigger |
| 3D | Three.js + react-three-fiber |
| Forms | React Hook Form + Zod |

### Infra

Docker (dev) / Kubernetes o Fly.io (prod). GitHub Actions CI. ELK / Loki
para logs. Prometheus + Grafana para métricas. OpenTelemetry para tracing.

---

## 3. Arquitectura multi-tenant

**Estrategia**: shared database + `tenant_id` UUID + **Row Level Security**.

- Toda tabla operativa tiene `tenant_id UUID NOT NULL`.
- Políticas RLS en PostgreSQL filtran a nivel de motor (defensa en profundidad).
- Middleware `ResolveTenant` resuelve por Bearer/slug/header y emite
  `SET LOCAL app.current_tenant`.
- `ResolveTenantByHost` es el último fallback para custom domains
  (`docs/CUSTOM_DOMAINS.md`).
- Migraciones globales (planes, países) viven sin `tenant_id`.

---

## 4. Reglas de negocio críticas

### Onboarding

1. Stripe Checkout → webhook `checkout.session.completed`.
2. `ProvisionTenant` crea tenant + admin (con `first_login_at = null`) +
   subscription + magic link 24 h por email.
3. Admin abre el magic link → cookie Sanctum corto-vivo → wizard
   identidad 5 pasos.

### Reserva (cliente público)

1. Cliente entra a `/b/{slug}`.
2. Selecciona servicio → barbero (o "primero disponible") → fecha → slot.
3. Lock optimista en Redis para evitar doble reserva del mismo slot.
4. Paga **depósito** (% configurable, default 30%).
5. Cita en estado `pending_confirmation`.
6. WhatsApp inmediato de confirmación.

### Anti no-show

| Momento | Canal | Acción |
|---------|-------|--------|
| T = creación | WhatsApp | Confirmación + recibo del depósito |
| T - 24h | WhatsApp | Recordatorio amigable |
| T - 2h | WhatsApp | Quick-reply: Confirmar / Reagendar / Cancelar |
| T - 1h | Sistema | Si no hay confirmación → cancelación automática |
| T - 1h | WhatsApp + Twilio Voice | Notificación + retención del depósito |

Lock distribuido en Redis para que el job no corra dos veces en flota multi-worker.

### Marketing y crecimiento

- **Retención**: query diaria de clientes inactivos > 30 días → campaña
  WhatsApp + cupón único trazable.
- **Loyalty**: cada N visitas completadas → recompensa automática
  (`docs/REFERRALS_LOYALTY.md`).
- **Referidos**: código único `BARB-XJ4Q` → cuando el referido completa
  primera cita, ambos reciben recompensa (`docs/REFERRALS_LOYALTY.md`).

### Calificaciones post-visita

24 h después de `completed`, WhatsApp con link `/r/<token>` único.
Cliente califica 1-5★. Sólo 4★+ se publica en `/b/<slug>`. Detalle en
`docs/RATINGS.md`.

### Finanzas

- Registro automático de cada cobro (servicio, producto, depósito, propina).
- Cierre de caja diario por barbero (efectivo vs digital).
- Cálculo de comisiones por barbero con regla configurable.
- Exportación contable (CSV, PDF). CFDI 4.0 pendiente.

### POS e inventario

- Integrado al check-out post-servicio.
- Stock mínimo, alertas, costo promedio ponderado.
- Cada venta descuenta stock atómicamente (transacción + lock).

---

## 5. Sistema de candados (Freemium UI)

### Principio

> Toda funcionalidad premium se **renderiza** pero se **bloquea**
> visualmente. El usuario ve lo que se está perdiendo → fricción de
> deseo → conversión.

### Implementación

**Frontend**:
```tsx
<FeatureGate feature="marketing.campaigns">
  <CampaignBuilder />
</FeatureGate>
```

Si el plan no incluye la feature: `pointer-events: none` +
`filter: blur(4px) grayscale(0.6)` + overlay con candado y CTA "Mejorar plan".

**Backend**: middleware `EnsureFeatureEnabled` valida contra
`tenants.subscription.features[]` antes del controller. Respuesta `402`
con `required_plan` y `upgrade_url`. **Defensa en profundidad**: nunca
confiar sólo en el gate frontend.

### Catálogo de features

| Feature | Free | Starter | Pro | Enterprise |
|---------|:----:|:-------:|:---:|:----------:|
| Agenda + 1 barbero | ✅ | ✅ | ✅ | ✅ |
| Reservas online | ✅ | ✅ | ✅ | ✅ |
| Múltiples barberos (hasta 5) | 🔒 | ✅ | ✅ | ✅ |
| Barberos ilimitados | 🔒 | 🔒 | ✅ | ✅ |
| WhatsApp | 🔒 | ✅ | ✅ | ✅ |
| Twilio Voice | 🔒 | 🔒 | ✅ | ✅ |
| POS + Inventario | 🔒 | 🔒 | ✅ | ✅ |
| Marketing de retención | 🔒 | 🔒 | ✅ | ✅ |
| Loyalty + Referidos | 🔒 | 🔒 | ✅ | ✅ |
| Reportes + API + Multi-sucursal | 🔒 | 🔒 | 🔒 | ✅ |
| Custom domain | 🔒 | 🔒 | 🔒 | ✅ |

---

## 6. Sistema visual (Old Money)

Detalle completo en `docs/IDENTITY_SYSTEM.md` y `docs/PRESETS.md`.

Resumen:

- **Paleta base** (`globals.css`): marfil + verde botella + oro mate +
  navy. Modos `light` / `sepia` / `dark` vía atributo `data-mode`.
- **Tipografía**: Cormorant Garamond italic (display) + Inter Tight (UI)
  + JetBrains Mono (numérico).
- **6 presets cromáticos por tenant**: Champagne, Esmeralda (default),
  Terracota, Medianoche, Rosa té, Bosque. Cada preset trae variante
  light + dark de 15 tokens.
- **Easing default**: `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo).
- **Hover signature**: `.hover-spread` (letter-spacing 0.04 → 0.08em).
- **Logo**: wordmark "lumia" italic con tijera SVG en la "i". Color via `currentColor`.

> **Cualquier color hardcoded fuera de `globals.css` debe usar tokens
> Tailwind (`text-primary`, `bg-bg-paper`) o CSS vars
> (`var(--lumia-*)` / `var(--tenant-*)`)**.

---

## 7. Estructura de carpetas

```
/
├── CLAUDE.md                              ← este archivo
├── README.md
├── docs/                                   ← una doc por feature
│   ├── 2FA.md, AUDIT_LOG.md, CALENDAR_SYNC.md, ...
│   ├── FEATURES.md                        ← catálogo de módulos
│   ├── SESSION_LOG.md                     ← bitácora histórica
│   ├── PRODUCTION_READINESS.md            ← roadmap a prod
│   └── SECRETS_RUNBOOK.md
├── .claude-skills/
├── .github/workflows/ci.yml
├── backend/                                ← Laravel 11
│   ├── app/
│   │   ├── Domain/
│   │   │   ├── Tenancy/, Identity/, Audit/, Scheduling/
│   │   │   ├── Appointments/, Staff/, Catalog/
│   │   │   ├── PointOfSale/, Inventory/
│   │   │   ├── Billing/, Payments/, Subscriptions/
│   │   │   ├── Notifications/, Marketing/, Finance/
│   │   │   ├── Growth/                    ← referidos + loyalty
│   │   │   ├── Engagement/                ← ratings + push
│   │   │   └── Calendar/                  ← Google + iCal
│   │   ├── Infrastructure/
│   │   │   ├── CircuitBreaker/, Persistence/
│   │   │   ├── Integrations/              ← Stripe, Meta, Google, Twilio
│   │   │   └── Observability/             ← ErrorReporter
│   │   ├── Http/
│   │   │   ├── Admin/Controllers/
│   │   │   ├── Client/Controllers/
│   │   │   ├── Public/Controllers/        ← checkout, magic, ratings, ical
│   │   │   ├── Webhooks/Controllers/
│   │   │   └── Common/Middleware/
│   │   ├── Console/Commands/
│   │   └── Mail/
│   ├── database/migrations/, seeders/
│   ├── tests/Feature/                     ← Pest
│   └── routes/api.php
└── frontend/                               ← Next.js 16
    ├── public/sw.js, icon-*.png
    └── src/
        ├── app/
        │   ├── (admin)/admin/             ← portal autenticado
        │   ├── (client)/b/[slug]/         ← reserva pública
        │   ├── r/[token]/                 ← rating post-visita
        │   ├── auth/magic/                ← onboarding magic link
        │   ├── checkout/success/
        │   ├── terminos, privacidad, cookies
        │   ├── api/                       ← route handlers
        │   └── manifest.ts
        ├── components/
        │   ├── admin/, branding/, client/, landing/, legal/, ui/
        │   └── PwaRegister.tsx
        └── lib/
```

---

## 8. Estándares de seguridad

- **SQL Injection**: Eloquent + Query Builder con bindings. Prohibido
  `DB::raw()` con interpolación.
- **N+1**: `with()` obligatorio + `Model::preventLazyLoading()` en dev.
- **XSS**: Blade auto-escape; React escapa por defecto. `dangerouslySetInnerHTML`
  requiere sanitización (DOMPurify).
- **CSRF**: NO se usa `statefulApi()`; auth 100% Bearer.
- **Rate Limiting**: 100 req/min por IP global + named limiters
  (`throttle:login`, `throttle:booking`, `throttle:webhook`).
- **2FA TOTP**: opt-in por usuario (`docs/2FA.md`).
- **Secrets**: Vault / Doppler / AWS SM (`docs/SECRETS_RUNBOOK.md`).
- **Webhooks**: HMAC obligatorio en Stripe / Meta / Twilio
  (middleware `webhook:<provider>`).
- **PII**: cifrado en reposo para `users.phone` y `users.notes` (Crypt
  + cast `encrypted`). `phone_hash` (sha256) para lookups indexables.
- **Audit log**: cambios en User/Tenant/Subscription/Branding registrados
  automáticamente con redaction de campos sensibles
  (`docs/AUDIT_LOG.md`).

---

## 9. Performance targets (frontend)

| Métrica | Objetivo |
|---------|----------|
| LCP | < 1.8s |
| INP | < 200ms |
| CLS | < 0.05 |
| FPS animaciones | 60 sostenidos |
| Bundle inicial admin | < 180KB gzipped |
| TTI portal cliente | < 2.5s en 4G |

Bundle analyzer en CI debería bloquear merges que rompan la cota
(pendiente de cablear). Ver convenciones responsive en `docs/RESPONSIVE.md`.

---

## 10. Estado vivo (al cierre de sesión)

> Este resumen se actualiza al final de cada tarea. Para histórico de
> incidentes y decisiones ver `docs/SESSION_LOG.md`. Para puntos
> pendientes ver `docs/PRODUCTION_READINESS.md`.

### Última sesión: 2026-05-07 — Bloques Z-EE (todo lo restante implementado)

6 mega-bloques finales sobre la base. Estado tras esta sesión:

- **Z. UIs admin pendientes**: POS ticketing completo (`/admin/pos/checkout`)
  con servicios+productos+cupón+gift card+propina, `/admin/cash-close`
  con preview + variance, `/admin/memberships` CRUD, `/admin/giftcards`,
  `/admin/security/policy` para `tenants.security.require_2fa`,
  `/admin/billing` real con subscription, endpoint de reschedule
  (drag-drop ready).
- **AA. Integraciones de negocio**: `BookAppointment` consulta
  `ClientMembership` y descuenta servicio si aplica
  (`covered`/`pending`), Stripe webhook `invoice.paid` resetea contador
  membership, `ProvisionTenantWithTrial` con free trial 14d + captura
  `?aff=`, comando `lumia:pay-affiliate-commissions` mensual,
  `FinkokCfdiPac` stub HTTP-ready para CFDI.
- **BB. UX final**: `Confetti` puro Canvas montado en `/checkout/success`,
  Cmd+K palette ahora hace búsqueda real al backend (`/api/admin/search`)
  con tag `kind` para clientes/servicios/productos, debounce 200ms.
- **CC. Tests**: MembershipFlowTest (cita gratis + GiftCard parcial/total/expired
  + invoice.paid renueva contador), EnforceTwoFactorTest (3 casos),
  StripeCouponTest con `Http::fake`. **88 passed / 3 skipped**.
- **DD. Infra/observabilidad**: `/api/up/deep` healthcheck profundo
  (DB+Redis+Stripe+Meta+mail), `RateLimitByTenant` middleware (600/min
  default), `/status` página pública con UI por sistema, `TracingHooks`
  stub OpenTelemetry-ready.
- **EE. Compliance + i18n + docs**: Cookie banner con categorías
  granulares (necesarias / analíticas / marketing) + re-consent anual,
  `lang/es/validation.php` completo, `docs/SCHEDULER.md`. Sidebar
  ampliado con 5 nuevos items (POS Cobrar, Cupones, Gift cards,
  Membresías, Política de seguridad).
- **Verificado smoke**: 7/7 endpoints nuevos → 200 con bearer real.

### Sesión anterior: 2026-05-07 — Bloques R-Y (UIs completas + features grandes)

8 mega-bloques sobre la base anterior. Estado tras esta sesión:

- **10 UIs admin nuevas** completas: walkin, coupons, recurrences,
  insights, platform, gallery, ratings, operations (POS landing),
  /admin/clients/{id} con timeline visual.
- **UX polish**: NotificationsBell + Cmd+K palette + DarkModeToggle.
- **Compliance avanzado**: 2FA enforcement por tenant, PII access log
  cableado, password complexity (Password::min(10)+mixed+numbers+symbols+uncompromised),
  comando `lumia:rotate-pii-key`, endpoint `/api/admin/security/pii-access`.
- **Operaciones**: scheduler con `lumia:materialize-recurrences`, Stripe
  Coupon real al completar referral, plantillas WhatsApp `referral_invite`,
  `post_visit_rating`, `login_new_device` cableadas.
- **Tests**: 79 passed / 3 skipped. Playwright E2E config + 2 happy
  paths (login + Cmd+K). Tests integración OutboundWebhook + WebPush.
- **Features grandes scaffolded**: Membership, ClientMembership,
  GiftCard, Affiliate, AffiliateReferral, CfdiInvoice. Interface
  `CfdiPac` con `NullCfdiPac` default.
- **OpenAPI 3.1 spec** completo en `docs/openapi.yaml`.
- **13 docs distribuidos**: WALK_IN_QUEUE, COUPONS, RECURRING,
  CLIENT_PORTAL, PLATFORM_API, SMART_FEATURES, COMPLIANCE, POS,
  MEMBERSHIPS, GIFT_CARDS, AFFILIATES, RUNBOOK, openapi.yaml.
- **Verificado smoke**: 11/11 páginas nuevas frontend → 200.
  9/9 endpoints admin nuevos → 200.

### Sesión anterior: 2026-05-07 — Bloques H-Q (production hardening completo)

9 mega-bloques sobre la base anterior. Detalle por feature en
`docs/ADVANCED_FEATURES.md`. Resumen tras esa sesión:

- **Tests Pest** cubren 75 casos sobre 2FA, audit, loyalty, referrals,
  ratings, custom domains, dunning, anti-no-show, branding scoping,
  webhook signatures, PII encryption.
- **Jobs background** funcionan: 4 jobs anti-no-show con delay real,
  Google Calendar sync bidireccional con refresh tokens,
  scheduler nightly con dunning + reverify domains + purge audit +
  expire referrals + materialize recurrences.
- **Web Push real** con VAPID JWT ES256 + AES-128-GCM puro PHP. Comando
  `php artisan lumia:generate-vapid` para emitir keypair.
- **Cita manual admin**, CRUD cupones, walk-in queue (modelo + UI
  pública `/q/{slug}`), mini portal cliente (`/me` con magic link +
  GDPR cliente), captura `?ref=` en BookingFlow.
- **`/admin/ratings`** para administrar reviews 1-3★ no publicadas.
- **Public API + API keys** con middleware `apikey:scope`.
- **Webhooks salientes** con HMAC firmados.
- **Smart scheduling** (huecos detectados) + **Stock predictivo** (días
  hasta stockout).
- **Cookie consent banner** + **dark mode toggle** + **Skeleton/EmptyState**.
- **Backups Postgres** con script + test mensual de restore.
- **Renovate config** para auto-merge de patches.
- **Prometheus alerts + Grafana dashboard JSON + OTel collector** listos
  para conectar.

### Sesión anterior: 2026-05-07 — Bloques A-G (features tier 1)

Sistema completo de retención + seguridad + observabilidad + white-label
total + PWA + ratings. 5 nuevos módulos de dominio (Audit, Growth,
Engagement, Calendar) + 8 docs específicos en `docs/`.

**Verificado end-to-end en local**:

- 38/40 tests Pest pasan (2 son pgsql-only y se skipean en SQLite).
- 6 endpoints nuevos verifiados con curl + login real:
  `/api/admin/{audit,loyalty,referrals,calendar,domains,security/2fa,...}`.
- Frontend compila las 9 páginas admin nuevas + 3 públicas
  (`/r/<token>`, `/auth/magic`, `/checkout/success`).
- Service worker registrado, manifest válido.
- `php artisan lumia:enforce-dunning --dry-run` corre limpio.

**Pendientes con dependencia externa** (necesitan acción humana o
credenciales reales):

1. `STRIPE_DRIVER=stripe` con keys live + price IDs por plan + webhook secret.
2. Aprobación Meta de las 4 plantillas WhatsApp (2-7 días) +
   `WHATSAPP_DRIVER=meta` con phone_id/token.
3. `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (Google Cloud Console)
   + redirect URI registrado.
4. `SENTRY_DSN` (o GlitchTip self-hosted).
5. **VAPID keys**: ahora basta con `php artisan lumia:generate-vapid`
   y pegar las claves en el gestor de secrets (la implementación es
   100% pura PHP, sin packages externos).
6. Postgres en CI/prod (DB_CONNECTION=pgsql) para activar RLS y los 2 tests skipped.
7. Logo real del tenant demo `el-navajazo`.
8. Iconos PNG `/public/icon-{192,512}.png` para PWA.
9. Revisión legal de `/terminos`, `/privacidad`, `/cookies` por abogado.
10. WAL archiving en Postgres si quieres PITR real (los scripts de
    backup en `infra/backups/` capturan snapshots base; PITR requiere
    archive_command activado en postgresql.conf).

**Pendientes de código** (UI faltante de features con backend OK):

- Vista calendario semanal en `/admin/agenda` (hoy es lista por días).
- Cmd+K búsqueda global del portal admin.
- Página `/admin/clients/{id}` con timeline visual del cliente.
- Onboarding tutorial guiado primera vez.
- Notificaciones in-app dropdown bell icon (modelo + endpoint OK).
- UI completa para `/admin/walkin`, `/admin/coupons`, `/admin/recurrences`,
  `/admin/insights`, `/admin/platform`, `/admin/gallery` (endpoints OK).
- POS real ticketing UI (modelos `Ticket` y `TicketItem` ya existen).
- Tip splitting + Cierre de caja diario UI (modelos existen).
- Free trial 14d cableado en Stripe Checkout.
- CFDI 4.0 MX integration con PAC (Finkok / SW Sapien) — feature grande.
- Multi-idioma EN con `next-intl`.
- App móvil del barbero (React Native / Capacitor).
- Storybook de componentes UI premium.
- OpenTelemetry tracing en Laravel (collector config ya está).
- 2FA enforcement por tenant (campo `tenants.security.require_2fa`
  persiste; frontend pendiente).
- Password complexity rules (hoy `min:6`).
- PII access log observer (tabla existe; observer no cableado).
- `php artisan lumia:rotate-pii-key` para rotación de APP_KEY con
  datos cifrados.

### Demo accounts (todos `password`)

| Email | Rol | Notas |
|-------|-----|-------|
| `admin@elnavajazo.test` | admin | onboarding hecho, plan Pro |
| `gerencia@elnavajazo.test` | manager | sin permisos delete |
| `recepcion@elnavajazo.test` | receptionist | lectura y citas |
| `diego@elnavajazo.test` | barber | sólo "mis horarios" |
| `admin@marfil.test` | admin | **sin onboarding** — dispara wizard |

### Cómo retomar en otra máquina

```bash
git clone <repo> && cd Sistema_Barberia

# Backend
cd backend
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
nohup php artisan serve --port=8000 > /tmp/lumia-backend.log 2>&1 & disown

# Frontend (otra terminal)
cd ../frontend
cp .env.local.example .env.local
npm install
npm run dev   # :3000
```

Validar: `curl http://localhost:8000/up`,
`curl http://localhost:3000/`, login con `admin@elnavajazo.test`.

---

## 11. Reglas operativas (no romper)

- **No se crean documentos planning/análisis** salvo si se piden — trabajo
  desde conversación, no desde docs intermedias.
- **No se commitea sin pedirlo el usuario**.
- **Dev servers se arrancan desligados** (`nohup ... & disown` en bash,
  `Start-Process -WindowStyle Hidden` en PowerShell). El daemon de
  background tasks mata procesos atados al shell padre.
- **Server Components nunca redirigen basados sólo en presencia de cookie** —
  siempre validar con `/auth/me`. Cookie inválida → pasar por `/api/auth/logout`
  que la borra antes de redirigir al login (evita loop de
  `history.replaceState`).
- **Nunca leer `sessionStorage`/`localStorage`/`window.*` dentro de
  `useState(() => ...)` o durante el body del componente** (provoca
  hydration mismatch). Usar `useEffect`.
- **Nunca invocar `$middleware->statefulApi()` mientras la SPA use
  Bearer tokens** — rompe rutas públicas con 419.
- **Cualquier color/spacing/font hardcoded debe ir vía token Tailwind o
  CSS var**, nunca como literal. Reglas responsive en `docs/RESPONSIVE.md`.
- **Toda pivot tenant-scoped declara `withPivot('tenant_id')`** y se
  sincroniza con shape `[id => ['extra' => valor]]`.
- **Audit log automatic en modelos críticos** vía trait `LoggableChanges`
  con redaction de campos sensibles (password, tokens, 2FA secret).

---

## 12. Protocolo de cierre de sesión

Al final de cada tarea:

1. Actualizar §10 con el estado vivo (qué se hizo, qué quedó pendiente).
2. Anotar incidente en `docs/SESSION_LOG.md` si hubo bug interesante.
3. Si la feature es nueva, crear/actualizar su `docs/<NOMBRE>.md`.
4. Mantener `docs/FEATURES.md` con el catálogo.
5. Proponer commits siguiendo Conventional Commits (`feat:`, `fix:`, `docs:`,
   `refactor:`, `chore:`, `test:`, `perf:`).

# LUMIA — Log histórico de sesiones

> Bitácora de cada sesión de desarrollo: incidentes, decisiones de
> producto, refactors mayores. Esto se mantiene aparte de `CLAUDE.md`
> para no inflar el contexto que se carga en cada conversación.
>
> Para incidentes técnicos del runtime (errores de prod), ver
> `audit_logs` en la base + Sentry.

## Plantilla

```
### [YYYY-MM-DD] Título corto del incidente / hito
- **Contexto**: dónde y cuándo apareció
- **Error / decisión**: mensaje exacto / motivación
- **Causa raíz / razón**: análisis
- **Solución**: qué se hizo
- **Prevención / regla nueva**: monitoreo, test, convención
```

---

## Entradas

### [2026-04-26] SQLite — pivot `barber_service.tenant_id` violaba NOT NULL en seeder

- **Contexto**: Primer `migrate:fresh --seed`. El seeder `DemoTenantSeeder` asocia servicios a barberos con `$barber->services()->sync($ids)`.
- **Error**: `SQLSTATE[23000] NOT NULL constraint failed: barber_service.tenant_id`.
- **Causa raíz**: La tabla pivot requiere `tenant_id`, pero `BelongsToMany::sync()` no popula columnas extras del pivot.
- **Solución**: `$barber->services()->sync($services->mapWithKeys(fn($s) => [$s->id => ['tenant_id' => $tenant->id]])->all())` y `withPivot('tenant_id')` en la relación.
- **Prevención**: convención obligatoria — toda pivot tenant-scoped declara `withPivot('tenant_id')` y se sincroniza con shape `[id => ['extra' => valor]]`.

### [2026-04-26] AvailabilityController pasaba `Stringable` a `Carbon::parse`

- **Contexto**: Endpoint `/api/client/availability` lanzando 500 al consultar slots.
- **Error**: `TypeError: Carbon\CarbonImmutable::parse() ... Illuminate\Support\Stringable given`.
- **Causa raíz**: `$request->string('date')` devuelve `Stringable`, no `string`.
- **Solución**: `->toString()` explícito.
- **Prevención**: en FormRequests/controllers, todo valor pasado al dominio debe ser cast explícito a `string`.

### [2026-04-28] Refundición visual a Old Money — paleta, logo, fuentes

Refactor mayor controlado. Paleta antigua (carbón + latón + bordeaux) → marfil + verde botella + oro mate + navy. Tipografía: Cormorant Garamond italic + Inter Tight + JetBrains Mono. Logo: wordmark "lumia" italic con tijera en la "i". Easing default `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo). Toda customización de color pasa por tokens (`text-primary`, `bg-bg-paper`, `var(--lumia-*)`) — código que hardcodee colores fuera de `globals.css` no pasa code-review.

### [2026-04-28] tenant_branding + roles ampliados + wizard onboarding

Migración `tenant_branding` (1-1), columna `users.first_login_at`, middleware `EnsureRole`, constants `ROLE_MANAGER`/`ROLE_RECEPTIONIST` con helpers `canWrite()`/`canSeeFinance()`, `BrandingController` con GET/PUT/onboarding, `BrandingProvider` que inyecta CSS vars scoped (cero contaminación entre sesiones paralelas). Convención: branding por tenant **nunca** sobrescribe `:root` global — siempre scoped al subtree.

### [2026-04-29] 419 al crear cita desde `/b/{slug}` (Sanctum statefulApi vs Bearer)

- **Causa raíz**: `bootstrap/app.php` tenía `$middleware->statefulApi()` que añade CSRF a toda `/api/*`. La SPA habla por Bearer, no cookies SPA.
- **Solución**: removido `statefulApi()`. Auth queda 100% Bearer.
- **Prevención**: comentario explícito en `bootstrap/app.php`. Test mínimo: `curl -X POST /api/client/appointments` sin headers debe responder 422 o 201, nunca 419.

### [2026-04-29] Loop "history.replaceState() more than 100 times per 10 seconds" en `/login`

- **Causa raíz**: `/admin/layout` veía cookie + `/auth/me` 401 → `redirect("/login")`; `/login/page` veía la misma cookie no borrada → `redirect("/admin")` → loop.
- **Solución**: `/api/auth/logout` acepta GET y borra cookies; `/admin/layout` redirige por ahí cuando hay 401; `/login` valida sesión real con `/auth/me` antes de redirigir.
- **Prevención**: regla — Server Components nunca redirigen basados sólo en presencia de cookie. Siempre validar contra el backend.

### [2026-04-29] Background task daemon mataba `npm run dev` al cerrar el handle

- **Causa raíz**: en macOS/Linux el daemon de background tasks de la herramienta cierra el shell padre cuando la tarea se "completa", enviando SIGTERM al hijo `next dev`.
- **Solución**: arrancar con `nohup npm run dev > /tmp/lumia-frontend.log 2>&1 & disown` (Linux/macOS) o `Start-Process -WindowStyle Hidden` (Windows).
- **Prevención**: dev servers largos siempre se levantan desligados del job table del shell.

### [2026-05-05 AM] Auditoría production readiness — punch-list de bloqueantes

Sesión de planning post-Tarea 3.1. Sin código — sólo `docs/PRODUCTION_READINESS.md` con 6 bloqueantes (B1-B6) y 6 importantes (I1-I6). Convención: cualquier decisión arquitectónica para producción se documenta primero en `PRODUCTION_READINESS.md` y luego se implementa.

### [2026-05-05 PM] Refundición del sistema de identidad — port de Lumina

6 presets con paleta light + dark de 15 tokens (vs 2 anteriores). Catálogo de 13 fuentes display + 11 body con preview real. `lib/branding-presets.ts` + `branding-adapter.ts` (flat ↔ rich) + Zustand store para live preview. Editor reescrito con 4 paneles independientes reutilizables en `OnboardingWizard`. Detalle en `docs/IDENTITY_SYSTEM.md` y `docs/PRESETS.md`.

### [2026-05-05] Hydration mismatch en `Preloader` por leer `sessionStorage` en initial state

- **Causa raíz**: `useState(() => sessionStorage.getItem(...))` corría en server (false) y cliente (potencialmente true) — primer render del cliente debe ser idéntico al server.
- **Solución**: state inicial siempre arranca en `"visible"`. La lectura de storage se mueve a `useEffect`.
- **Prevención**: regla — **nunca** leer `sessionStorage`/`localStorage`/`window.*` dentro de `useState(() => ...)` o durante el body del componente.

### [2026-05-06] Bugs del editor de identidad + pase de responsive completo

- **Bug 1**: `<input type="color">` solo acepta `#RRGGBB`; los tokens `border`/`divider` son rgba con alpha. Arreglo: `toHexColor()` normaliza antes del color picker.
- **Bug 2**: editor "no guardaba" por preview store no sincronizado tras `router.refresh()`. Arreglo: push al preview ocurre en `setDraft()` wrapper, no en `useEffect([draft])`; `dirtyRef` evita pisar edición; tras save, `clearPreview()` y sync con `payload.data`.
- **Pase responsive**: AdminSidebar con drawer móvil, Navbar con menú móvil, modales con `max-h-[92vh]`, tablas con `overflow-x-auto`. 32 findings auditados y arreglados. Detalle por archivo en `docs/RESPONSIVE.md`.

### [2026-05-07] Production hardening + tests + observability + Stripe + WhatsApp

Bloque B5 (hardening) + B4 (PII) + B6 (secrets) + B2 (Stripe Checkout flow) + B3 (WhatsApp real client) + B1 (Postgres prep) + I1 (Pest tests) + I3 (UI permisos) + I2 (Products + BusinessHours UI) + I5 (observabilidad) + I6 (legal/GDPR) + I4 (Docker prod). Detalle de cada feature en `docs/<NOMBRE>.md`. Tests Pest: 38 passed / 2 skipped (Postgres-only).

### [2026-05-07 amanecer] Bloques Z-EE — UIs faltantes + integraciones negocio + compliance final

Sexta pasada del día. Estado al cierre:

- **Z. UIs admin**: POS ticketing real (`/admin/pos/checkout`) con cart sticky,
  cupón + gift card aplicados, propina, método de pago. `/admin/cash-close`
  calcula gross + comisión + tips + variance. `/admin/memberships` CRUD.
  `/admin/giftcards` con emisión y status. `/admin/security/policy` para
  `tenants.security.require_2fa`. `/admin/billing` con subscription real.
  `AppointmentRescheduleController`. `GlobalSearchController` para Cmd+K.
- **AA. Integraciones**: `BookAppointment::isCoveredByMembership()` —
  cita gratis si el cliente tiene membership disponible, descuenta del
  contador. Stripe webhook `invoice.paid` renueva el período de la
  membership. `ProvisionTenantWithTrial` con free trial 14d + captura
  `?aff=`. Cron mensual `lumia:pay-affiliate-commissions`. `FinkokCfdiPac`
  stub. `IssueStripeCoupon` real cuando referral completa.
- **BB. UX final**: `Confetti` puro Canvas en `/checkout/success`.
  `CommandPalette` con búsqueda real al backend (debounce 200ms,
  clientes/servicios/productos del tenant).
- **CC. Tests**: MembershipFlow, EnforceTwoFactor, StripeCoupon. Total:
  **88 passed / 3 skipped**.
- **DD. Infra**: `/api/up/deep` healthcheck DB+Redis+Stripe+Meta,
  `RateLimitByTenant` middleware, página pública `/status`, `TracingHooks`
  stub OpenTelemetry-ready.
- **EE. Compliance + i18n**: Cookie banner con categorías granulares +
  re-consent anual. `lang/es/validation.php` completo. `docs/SCHEDULER.md`.

**Bug encontrado y resuelto**: `Tenant.security` no estaba en `$casts`
como array → `EnforceTwoFactor` no detectaba el flag. Añadido cast.

### [2026-05-07 madrugada] Bloques R-Y — UIs admin completas + features grandes scaffolded

Última pasada masiva (8 mega-bloques). Estado al cierre:

- **R. 10 UIs admin** que faltaban: `/admin/walkin`, `/admin/coupons`,
  `/admin/recurrences`, `/admin/insights`, `/admin/platform` (tabs API
  keys + webhooks), `/admin/gallery`, `/admin/ratings`, `/admin/operations`
  (POS + cash + tips landing). Cada una con sus route handlers proxy y
  `EmptyState`/`Skeleton` aplicados.
- **S. UX polish**: `NotificationsBell` dropdown integrado al topbar,
  `CommandPalette` con Cmd+K (24 destinos navegables con búsqueda fuzzy),
  página `/admin/clients/{id}` con timeline visual del cliente
  (visitas + reviews + recompensas). `DarkModeToggle` flotante en
  desktop.
- **T. Compliance**: middleware `EnforceTwoFactor` que redirige cuando
  `tenant.security.require_2fa = true`, `PiiAccessLogger` cableado en
  Marketing/GDPR/ClientTimeline, regla `StrongPassword` (Password::min(10)
  ->mixedCase->numbers->symbols->uncompromised), comando
  `lumia:rotate-pii-key`, endpoint `/api/admin/security/pii-access` para
  auditoría.
- **U. Operaciones**: scheduler agrega `lumia:materialize-recurrences`
  daily 05:00. Listener `HandleAppointmentCompleted` ahora emite
  Stripe Coupon real (vía `IssueStripeCoupon`) cuando un Referral pasa
  a `completed`. Templates WhatsApp `referral_invite`,
  `post_visit_rating`, `login_new_device` cableados en config.
- **V. Tests E2E + integración**: Playwright config + 2 tests E2E
  (login + Cmd+K), tests `OutboundWebhookTest` (HMAC + auto-deactivate
  tras 10 fallos), `WebPushPayloadTest`. Total: **79 passed / 3 skipped**.
- **W. Features grandes scaffolding**: tablas + modelos para
  `Membership`, `ClientMembership`, `GiftCard`, `Affiliate`,
  `AffiliateReferral`, `CfdiInvoice`. Interface `CfdiPac` con
  `NullCfdiPac` default. OpenAPI 3.1 spec completo en `docs/openapi.yaml`.
- **X. Docs distribuidas**: 13 nuevos `.md` específicos por feature,
  `FEATURES.md` actualizado con índice maestro de todos los docs.
- **Y. Responsive audit + smoke**: todas las páginas nuevas siguen las
  convenciones de `docs/RESPONSIVE.md`. Endpoints verificados con bearer
  real responden 200.

**Bug encontrado y resuelto**: `WebPushPayloadTest` fallaba en algunos
builds de PHP que no exponen `prime256v1`. Test marcado como skipped
en ese caso vía `markTestSkipped` con detección runtime.

### [2026-05-07 noche] Bloques H-Q — production hardening + ecosystem completo

Sesión muy larga (~9 mega-bloques). Estado al cierre:

- **H. Tests Pest** para 6 features nuevos: 2FA (recovery codes consume,
  rejects invalid), AuditLog observers (created/updated/deleted con
  redaction), Loyalty award (idempotencia + reward emission), Referrals
  (status transitions), Ratings (token único + 4★+ política), Custom
  Domains (TXT verification mocked), Dunning command. Total: **75 tests
  passed / 2 skipped (Postgres-only)**.
- **I. Jobs background**: 4 jobs anti-no-show reales con `delay()` y
  lock distribuido en cache. `SyncAppointmentToGoogle` con refresh
  automático de access_token. Comandos artisan: `lumia:reverify-domains`,
  `lumia:purge-audit-logs`, `lumia:expire-referrals`,
  `lumia:materialize-recurrences`. Scheduler en `routes/console.php`.
- **J. Web Push real (VAPID)**: implementación pura PHP (~300 líneas) —
  `WebPushSigner` (JWT ES256 firmado con OpenSSL EC P-256),
  `WebPushPayloadEncrypter` (AES-128-GCM + ECDH P-256 + HKDF según RFC
  8291), `SendPushNotification` con auto-borrado de subs 410.
  `lumia:generate-vapid` y `lumia:push-test`.
- **K. Features grandes**: cita manual desde admin, CRUD cupones (single
  + bulk), recurrencias de cita (modelo + materialización), walk-in
  queue (modelos + controllers admin/público + UI cliente `/q/{slug}`),
  mini portal cliente (`/me` con magic link 30 min + GDPR
  export/delete), captura de `?ref=` en BookingFlow, `/admin/ratings`
  para republicar reviews 1-3★.
- **L. UX polish (parcial)**: `Skeleton`, `EmptyState`, `DarkModeToggle`,
  `CookieConsentBanner` (montado en root layout). Pendiente: vista
  calendario semanal en agenda, Cmd+K, timeline cliente, in-app notif
  bell — documentadas en `ADVANCED_FEATURES.md`.
- **M. Compliance**: `tenant.security` JSON con `require_2fa` (campo
  existe, enforcement frontend pendiente). Endpoints GDPR cliente
  (`/me/data-export`, `/me/data-deletion`). Tabla `pii_access_log`
  creada (observer pendiente). Cookie consent banner cliente operativo.
- **N. Ecosystem**: tabla `api_keys` con tokens `lk_xxx_yyy` (sha256
  persistido), middleware `apikey:scope` con allowlist. Tabla
  `outbound_webhooks` + `outbound_webhook_deliveries`. Listener
  `BroadcastDomainEvent` dispara HMAC-firmados a las URLs suscritas.
  Endpoint `GET /api/v1/appointments` ya consumible con API key.
- **O. Smart features**: `GET /api/admin/insights/smart-slots` (huecos
  por barbero/weekday/hour últimas 8 sem). `GET /api/admin/insights/stock-forecast`
  (días hasta stockout por producto + flag `reorder_now`). Tabla
  `cut_gallery` (consent + auto-expiry 180 días).
- **P. Infra**: scripts `infra/backups/{pg-backup,pg-restore-test}.sh`,
  `.github/renovate.json`, `prometheus-alerts.yml`, dashboard JSON
  Grafana, OTel collector config, plantilla status page.
- **Q. Docs**: `docs/ADVANCED_FEATURES.md` consolidado de todo lo nuevo;
  `STATUS_PAGE.md`; CLAUDE.md §10 actualizada.

**Verificado end-to-end**: Pest 75/2, 9 endpoints nuevos responden 200
con bearer real, `/api/v1/*` funciona con API key.

**Bug encontrado y resuelto**: el código nuevo en `BookAppointment`
generaba doble `return` y los nuevos jobs iban dentro de la transacción.
Reescrito limpio con array tuple `[Appointment, CarbonImmutable]`
del cierre y dispatching post-commit gateado por
`! runningUnitTests()`.

### [2026-05-07 tarde] Bloques A-G — features tier 1

- **A. 2FA + audit + Sentry-compat**: TOTP RFC 6238 puro PHP, audit log automático con observers, error reporter HTTP sin SDK, login alerts ante IP/UA inusual.
- **B. Referidos + loyalty**: programa configurable por tenant con cada N visitas → recompensa; referrals con código único trazable.
- **C. Calendar + dunning**: Google OAuth (HTTP puro), iCal feed por barbero con token, dunning Stripe con grace period configurable.
- **D. Custom domains**: tabla `tenant_domains`, middleware `ResolveTenantByHost`, verificación TXT DNS automática.
- **E. PWA + push + ratings**: manifest + service worker con cache strategies, suscripción Web Push (envío VAPID pendiente), ratings post-visita con token único de un solo uso, política "4★+ se publica".
- **F. Responsive audit**: convenciones documentadas en `docs/RESPONSIVE.md`.
- **G. Docs distribuidas**: 1 `.md` por feature en `docs/`, `CLAUDE.md` compactado a referencia + estado vivo.

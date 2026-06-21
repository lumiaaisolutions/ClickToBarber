# CHANGELOG del fork ClickToBarber

> Bitácora del fork desde el upstream `Sistema_Barberia`. Una entrada por sesión.

---

## 2026-06-20 — Sesión 3 (cierre del codificable: logo, dark-mode preflight, SEO, E2E)

> Última pasada en seco del lado de Claude. Después de esta sesión el sistema
> queda **100% codificable hecho** — sólo restan las 4 acciones humanas
> (DNS, MySQL, Stripe, Mail) documentadas en `SETUP_PRODUCCION.md`.
>
> Divido el trabajo en 6 fases y avanzo en orden, validando antes de pasar
> a la siguiente.

### Fase 1 — Logo distintivo (no más tijera genérica)
- `apps/web/src/components/Logo.tsx` reescrito. Mark = cuadrado redondeado con gradient azul→cyan, **silla de barbero estilizada blanca** (respaldo curvo + asiento + pata + base) + **tijera mini** en esquina inferior derecha con anillos translúcidos y pivote.
- ID de gradiente único por mount (`ctb-${Math.random()}`) — fix para colisión cuando hay 2+ logos en la misma página (sidebar + login + hero).
- `apps/web/public/favicon.svg` + `apple-icon.svg` matchean el mark (sin texto).
- Wordmark mantiene "Click**To**Barber" con el "To" en `--md-primary`.

### Fase 2 — Dark mode sin flash
- `apps/web/src/app/layout.tsx`: inline `<script>` en `<head>` (`DARK_MODE_PREFLIGHT`) que lee `localStorage.ctb:mode` o `prefers-color-scheme` y setea `data-mode` ANTES del hydrate. Sin esto el usuario veía un flash blanco al cargar incluso en modo oscuro.
- `apps/web/src/lib/notify.ts`: `resolveFill()` lee `data-mode` y pinta los Sileo toasts `#1F1F1F` en dark / `#FFFFFF` en light. Aplica per-toast — el theme=dark del lib en sí no aceptaba override por toast antes.

### Fase 3 — Copy del BrandingEditor para barberos (no devs)
- `apps/web/src/components/admin/BrandingEditor.tsx` (877 líneas, componente pesado del wizard de personalización del sitio público).
- `STEP_TITLES` reescritos: "Layout"→"Estilo visual", "Tipografía"→"Letras", "Paleta"→"Colores".
- `STEP_DESCRIPTIONS` traducidos a lenguaje barbero: "Es lo primero que la gente ve cuando entra a tu página", "Qué tan compacto se ve todo", etc.
- Quitada referencia a "modo claro y oscuro sincronizados" (jerga) → "se ve bien de día y de noche".

### Fase 4 — SEO básico server-side
Ver [`docs/features/seo.md`](features/seo.md).
- `apps/web/src/app/robots.ts` — Allow `/`, `/precios`, `/login`, `/b/`, `/q/`. Disallow `/admin/`, `/api/`, `/me`, `/r/`, `/checkout/`. Sitemap apunta a `https://clicktobarber.lumiaaisolutions.com/sitemap.xml`.
- `apps/web/src/app/sitemap.ts` — sitemap estático con landing + precios + login + términos + privacidad + cookies. **Decisión**: no enumerar `/b/{slug}` para no exponer lista de tenants — el sharing es orgánico vía link directo de cada barbería.
- `apps/web/src/app/b/[slug]/page.tsx` — `generateMetadata()` dinámico por tenant: title `{Tenant} — Reserva tu cita`, description con tagline + address, OG `cover_image` como `og:image` 1200×630, Twitter card `summary_large_image` cuando hay cover. Verificado HTTP 200 + headers OK.

### Fase 5 — E2E Playwright actualizado
- `apps/web/playwright.config.ts` — baseURL `:3000`→`:3100` (donde corre nuestro Next), env var renombrada `LUMIA_E2E_URL`→`CTB_E2E_URL`.
- `apps/web/e2e/admin-login.spec.ts` reescrito (3 tests): login demo, Cmd+K + navegación, logout cleanup. Fixed selectores stale: "Iniciar sesión"→"Entrar", placeholder "Ir a"→"Buscar", quitada referencia a "Bitácora" (audit log fue cortado en sesión 1).
- `apps/web/e2e/public-booking.spec.ts` **nuevo** (5 tests): hero cinemático visible, CTA hace scroll al booking, flujo completo 5 pasos (servicio → barbero → fecha → datos → confirmación), meta chips visibles, 404 en slug inexistente.

### Fase 6 — Documentación final
- `docs/features/seo.md` **nuevo** — qué se indexa y qué no, decisiones, cómo el OG dinámico mejora compartir en redes.
- `docs/CHANGELOG-fork.md` — esta entrada.
- `docs/SETUP_PRODUCCION.md` actualizado con sección "Estado del código" + checklist de verificación post-deploy.

### Estado al cierre
**100% del código está hecho.** Sólo quedan las 4 acciones humanas (no codables) en `SETUP_PRODUCCION.md`. Tests Pest 30/32 pasando (2 skipped documentados), Playwright E2E suite cubre el happy path admin + el booking público. El sistema corre completo en local (`http://localhost:8000` API + `http://localhost:3100` web) y está listo para deploy.

---

## 2026-06-20 — Sesión 4 (primer deploy a producción)

> Sistema en el aire por primera vez. Todo el trabajo de esta sesión fue
> operativo/infra — cero features nuevas. Se documentan los gotchas para
> que el próximo deploy sea trivial.

### Configuración externa (automatizada con APIs)

- **Stripe live mode** — 3 productos × 2 ciclos = 6 precios creados vía
  Stripe API (restricted key `rk_live_...` ya borrada). Webhook registrado en
  `https://clicktobarber-api.lumiaaisolutions.com/api/webhooks/stripe` para
  `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`,
  `invoice.payment_failed`.
- **DNS** — Registros A/CNAME configurados vía Hostinger REST API
  (`https://developers.hostinger.com`, **no** `api.hostinger.com` que
  devuelve 530). Payload correcto: `{"zone": [...records]}`.
- **MySQL** — Fernando creó la BD `u221820910_clicktobarber` en hPanel
  (no hay API REST para VPS databases — solo para shared hosting).
- **Mail** — SMTP `fernando@lumiaaisolutions.com` con alias saliente
  `noreply@lumiaaisolutions.com`. No se creó buzón nuevo.

### Fixes de deploy (bugs encontrados en primera pasada)

1. **`composer.lock` incompatible con PHP 8.3**: El lock fue generado
   localmente con PHP 8.4 → Symfony 8.x requiere PHP 8.4 → el servidor tiene
   PHP 8.3.30. Fix permanente: `composer config platform.php 8.3.30` en
   `apps/api/` + `composer update`. El `platform.php` queda en `composer.json`.

2. **Índice MySQL > 64 caracteres**: `calendar_external_events_calendar_connection_id_appointment_id_unique`
   = 70 chars → MySQL rechaza. Fix: nombre explícito `cal_ext_events_conn_appt_unique`
   en `database/migrations/2026_05_07_120001_create_calendar_tables.php`.

3. **`php artisan storage:link` bloqueado por CageFS**: `exec()` deshabilitado.
   Fix: `ln -sfn .../storage/app/public .../public/storage` vía SSH directo.

4. **`cache:clear` antes de que existan las tablas (primera instalación)**:
   El script de deploy limpia antes de migrar → falla si `cache` no existe.
   Fix para primera vez: orden manual key→migrate→clear→build→seed.

5. **Passenger `.htaccess` manual**: hPanel no muestra "Node.js" para subdominios
   VPS. Solución: crear `public_html/.htaccess` con directivas Passenger copiadas
   de ClickToEat + directorio `nodejs/tmp/` a mano. Ver `runbook/deploy-clicktobarber.md`.

6. **`useSearchParams()` sin Suspense en `/auth/magic`**: Next.js 16 rechaza SSG
   de páginas con `useSearchParams` fuera de `<Suspense>`. Fix: extraer lógica a
   `MagicLinkContent` + envolver en `<Suspense>` en el page export.

### Estado al cierre

| URL | Estado |
|---|---|
| `https://clicktobarber-api.lumiaaisolutions.com/up` | ✅ 200 |
| `https://clicktobarber.lumiaaisolutions.com/` | ✅ 200 |
| `/robots.txt` + `/sitemap.xml` | ✅ 200 |
| `/b/el-navajazo` OG tags (title + description + image) | ✅ OK |
| Migraciones | ✅ 20/20 |
| Seeds | ✅ `el-navajazo` + `marfil-avenue` |
| Stripe webhook | ✅ registrado (pendiente test manual desde Dashboard) |

**Pendiente humano:**
- 2 cron jobs en hPanel (schedule:run + queue:work) — ver `SETUP_PRODUCCION.md`.
- Renovar VPS (vence 2026-06-23).
- Borrar restricted key `rk_live_...` de Stripe Dashboard.

---

## 2026-06-19 — Sesión continuación (rediseño visual completo + features faltantes)

> Segunda parte del día. La sesión anterior dejó el fork técnicamente
> funcional. Esta sesión lo dejó **listo para clientes finales**:
> rediseño visual completo, precios reales, copy sin jerga, tests Pest,
> y todo el flujo público pulido al detalle.

### Nuevos endpoints backend
- **`POST /api/admin/billing/portal`** — `BillingPortalController`. Crea Stripe Customer Portal session para que el dueño cambie tarjeta/plan/cancele. 409 + `action:"activate_existing"` si no hay `stripe_customer_id`. Ver [`docs/api/billing.md`](api/billing.md).

### Tests Pest nuevos (30 passed, 2 skipped)
- `ExpireManualTrialsTest` — 5 casos cubren expiración de trials manuales (vencido, futuro, pago_externo, con sub Stripe, batch).
- `TenantActivePlanTest` — 7 casos cubren la lógica de `hasActivePlan()` (pago_externo override, sin plan, trialing, active, canceled dentro/fuera período).
- `BillingActivateExistingTest` — 6 casos cubren validaciones + mock mode + 409.
- `BillingPortalTest` — 3 casos.
- `WaLinkWhatsappTest` — 6 casos cubren templates + link wa.me bien formado + id único + fallback genérico.
- `WhatsappBindingTest` — 4 casos verifican el binding híbrido (cloud+creds, cloud sin creds, wa_link, log).
- **Bonus fix**: `BillingActivateExistingController` reordenado — mock mode ahora bypasea check de `STRIPE_PRICE_*` env vars.

### Pricing actualizado (todo el stack)
- **$0 / $299 / $599 / $1,199** (era $0/$499/$999/$1,999).
- `PlanSeeder.php` con descripciones friendly.
- DB re-seeded.
- `FALLBACK_PLANS` en `apps/web/src/app/page.tsx`.
- `docs/SETUP_PRODUCCION.md` tabla Stripe con precios mensuales + anuales.
- `LandingPricing.tsx` FEATURES con **9 codes que coinciden 1:1 con el FeatureGate del backend**. Eliminados meta-features inventados (`branding_basic/full`, `role_receptionist/manager`, `custom_domain`) que NO existían en el backend → lo que se promete = lo que se entrega.

### Sistema visual completo (Material 3 inspired)
Ver [`docs/features/visual-system.md`](features/visual-system.md).

- **Foundation**: `globals.css` reescrito con tokens Material 3 (`--md-primary` Google Blue `#1A73E8`, surfaces `#FFFFFF`/`#F8F9FA`, outlines casi invisibles, elevación suave 4 niveles, easing M3).
- **Tipografía final**: **Geist** (sans, body, UI) + **Instrument Serif** (display italic opt-in via `.font-serif-italic`). Variables: `--font-geist`, `--font-instrument`. Misma stack que ClickToEat. Decisión documentada en [`ADR-004`](decisions/ADR-004-typography-geist.md).
- **Botones M3 completos**: `.btn-filled`, `.btn-tonal`, `.btn-outlined`, `.btn-text`, `.btn-elevated`, `.btn-accent`.
- **Inputs M3** con focus 2px border + padding longhand (`pl-10` de Tailwind ahora funciona sin pelearse con shorthand).
- **Sileo toasts blancos**: theme=dark counterintuitivo + `fill:"#FFFFFF"` per-toast + CSS overrides para título dark + sombra suave + sin text-transform capitalize.

### Sweep masivo de jerga técnica (~50 archivos)
- **Admin**: Dashboard, BillingPortal, Marketing, Finance, Insights, Cupones, Cierre de caja, Memberships, Loyalty, Referrals, Walk-in, Security policy, POS Checkout, Products, Services, Staff, Citas que se repiten, Identity, Gallery, Mi plan, etc.
- **Cliente público**: TenantHero, BookingFlow, ClientPortal, Rating, WalkInQueue, Affiliates.
- **Onboarding**: Wizard + Tour con steps friendly ("Cómo va tu día", "Tu agenda", "Tu marca").
- **Legal**: cookies, terminos, privacidad, status — MercadoPago removido, "ClickToBarber AI Solutions"→"ClickToBarber", `bp_token`→`ctb_token`.
- **Emails**: `onboarding-magic-link.blade.php` reescrito con branding ClickToBarber.
- **CommandPalette** (Cmd+K): 24 entries reescritas para coincidir con sidebar nuevo.

### AdminSidebar rediseñado
- 6 grupos colapsables (Inicio, Tu negocio, Ventas y caja, Marketing, Reputación, Configuración).
- Wheel scroll fix con `data-lenis-prevent`.
- API & Webhooks + Operación removidos del menú (URLs siguen accesibles).
- Labels friendly: "Productos" (no POS Inventario), "Cobrar", "Lealtad", "Tarjetas regalo", "Estadísticas", "Mi plan".
- **Footer rediseñado**: avatar circular gradient con iniciales + role chip + tarjeta tonal "Tu sitio público" con URL preview + botones pill inline "Tour" / "Salir".

### Dashboard
- `WhatsAppBanner` gradient azul→cyan auto-hide cuando driver=cloud, dismissable 7 días via localStorage. Link **corregido**: `business.facebook.com/wa/manage/home` (rompía 404 sin Meta account) → `business.whatsapp.com/products/business-platform` (landing público).

### Landing page
- **GSAP + ScrollTrigger** instalado. Nuevo `LandingScrollScrub` con pin+scrub: 4 escenas Unsplash reales (cliente reserva, WhatsApp, barbero atiende, vuelve) con crossfade `scale 1.05→1` + textos sincronizados + badge `01/04 → 04/04`. CTA solo en última escena.
- **LandingHero**: orbs con `filter: blur(60px)` + `translate3d(0,0,0)` + `willChange: transform` para capa GPU. Lenis `lerp 0.10 → 0.08` para sentir más responsivo.
- **LandingFeatures, Pricing, Footer, HorizontalScroll**: rebrandeados friendly.

### Login redesign
- **Split layout** desktop (50% banner Unsplash con overlay gradient + 50% form) / stack mobile.
- Banner sin testimonial inventado ni stat "500+ barberías" falso. Solo 2 stats reales (24/7 reservas + −87% faltas).
- **Icons sin overlap** vía `style={{ paddingLeft: "2.75rem" }}` inline (override garantizado contra cascade).

### Sitio público `/b/{slug}` — primeros 3 segundos WOW
Ver [`docs/features/public-client-site.md`](features/public-client-site.md).

- **TenantHero cinematográfico**: cover photo full-bleed + gradient overlay 4-stop para legibilidad + status chips (Reserva online + 4.9 rating) + eyebrow + título gigante (clamp 2.6→6.5rem) + tagline ligera + meta chips frosted + **CTA pill** centrada con gradient icon + anticipo info.
- **100% configurable por tenant** vía BrandingProvider: `var(--lumia-font-display)`, `var(--lumia-font-body)`, `var(--lumia-accent)`, `var(--lumia-accent-deep)`, `var(--lumia-ink)`. Fallback a tokens de la plataforma si el tenant no setea nada.
- **BookingFlow premium rediseñado**:
  - Stepper con barra gradient animada + círculos pulse cuando activo + check con stroke 3 al completar.
  - ServiceCard con hover `-translate-y-1` + label "Elegir →" que aparece.
  - BarberCard avatar con ring que se vuelve primary + fallback gradient (no gris).
  - Time slots como pills vellum → primary con shadow al hover.
  - DatePicker días con shadow primary glow cuando seleccionados.
  - Summary card con bg surface-container-low.
  - Anticipo box con gradient primary-container → secondary-container + icono Sparkles.
  - Done screen con check scale animation.

### Performance hardening
- Lenis tuneado.
- Orbs y motion blocks con `will-change` + `translate3d` hints.
- Navbar `backdrop-blur-xl → blur(12px)` para reducir cost del paint en scroll.
- LandingScrollFlow procedural draw eliminado (causaba jank con headline overlap).

### Documentación creada/actualizada en esta sesión
- `docs/api/billing.md` — 3 endpoints (status, activate-existing, portal).
- `docs/features/visual-system.md` — tokens, fuentes, BrandingProvider.
- `docs/features/public-client-site.md` — anatomía del `/b/{slug}` y customización por tenant.
- `docs/decisions/ADR-004-typography-geist.md` — por qué terminamos con Geist + Instrument Serif.
- `docs/SETUP_PRODUCCION.md` — actualizado con precios nuevos.
- `docs/CHANGELOG-fork.md` — esta entrada.

### Pendiente
Sigue igual que al final de la sesión 1 (DNS + MySQL + Stripe + Mail en tu cancha). Ningún bloqueante adicional. Logo SVG custom + tests para los componentes deep (BrandingEditor) siguen como nice-to-have post-deploy.

---

## 2026-06-19 — Fork inicial

**Objetivo**: clonar `LUMIA-AI-SOLUTIONS/Sistema_Barberia`, rebrand como
ClickToBarber, adaptar a Hostinger VPS (CageFS), preparar para deploy en
`clicktobarber.lumiaaisolutions.com`.

### Estructura
- Repo movido `/tmp/Sistema_Barberia` → `~/Desktop/LUMIA/clicktobarber/`, origin desconectado.
- Layout estándar: `backend/` → `apps/api/`, `frontend/` → `apps/web/`.
- Creadas: `scripts/`, `docs/architecture/`, `docs/api/`, `docs/features/`, `docs/runbook/`, `docs/decisions/`.

### Rebrand
- `composer.json` name → `lumia/clicktobarber-api`.
- `package.json` name → `clicktobarber-web`.
- `apps/api/.env.example` — `APP_NAME=ClickToBarber`, DB default MySQL con vars Hostinger.
- `apps/web/src/app/layout.tsx` — metadata `ClickToBarber — Software para barberías…`.
- `README.md`, `CLAUDE.md`, `docs/SETUP_PRODUCCION.md` reescritos para ClickToBarber.
- `LandingFooter` — copyright `© ClickToBarber by LUMIA`.

### Cuts (5 features) — ver [ADR-003](decisions/ADR-003-fork-cuts-vs-upstream.md)
- **2FA TOTP**: rutas `/auth/2fa/*` + `/admin/security/2fa/*` removidas. `EnforceTwoFactor` middleware fuera. `TotpService`, `TwoFactorController` eliminados. `AuthController` + `LoginForm` reescritos sin 2FA.
- **Audit log**: endpoint `/admin/audit` removido + página frontend. `AuditLogger` interno se mantiene (lo usan controllers existentes).
- **CFDI 4.0 MX**: rutas `/admin/cfdi/*`, `CfdiController`, `Infrastructure/Integrations/Cfdi/*`, `CfdiInvoice`, `CfdiPac` eliminados.
- **Custom domains**: rutas `/admin/domains/*`, `TenantDomainController`, `TenantDomain`, `ResolveTenantByHost` middleware eliminados. Página admin/domains fuera.
- **PWA push**: rutas `/push/*`, `PushSubscriptionController`, `PushSubscription`, services `WebPush*`, `manifest.ts`, `PwaRegister` eliminados.

### Migraciones
- Eliminada: `2026_04_27_000001_enable_rls_for_tenant_tables.php` (RLS Postgres-only).
- Añadida: `2026_06_19_000001_add_pago_externo_to_tenants.php`.
- Añadida: `2026_06_19_000002_drop_unused_tables.php` (drop `tenant_domains`, `push_subscriptions`).

### Adaptación a Hostinger CageFS
- `NullCircuitBreaker` creado — reemplaza Redis por default. Redis opt-in via `CB_DRIVER=redis`.
- Cache/Queue/Session drivers default a `database` (sin Redis).
- Horizon no instalado.
- `.htaccess` raíz + `apps/api/public/.htaccess` con security headers (HSTS, X-Frame-Options, X-Content-Type-Options).

### DB: PostgreSQL → MySQL — ver [ADR-001](decisions/ADR-001-mysql-over-postgres.md)
- `apps/api/.env.example` default a mysql.
- `ResolveTenant::SET LOCAL` ya tenía guard `if pgsql` — sin cambios.
- Auditoría confirmó que migraciones usan `->json()` (no `->jsonb()`), UUIDs portables, sin SQL pg-only.

### WhatsApp híbrido — ver [ADR-002](decisions/ADR-002-whatsapp-hybrid.md)
- `WaLinkWhatsappClient` creado: genera deep-links `wa.me/<num>?text=<encoded>` con 4 templates.
- `DomainServiceProvider` binding inteligente con fallback automático.
- Default `WHATSAPP_DRIVER=wa_link`.

### Billing — Stripe Cashier patterns (portados de ClickToEat)
- Migración añade `pago_externo` boolean a `tenants`.
- `Tenant::hasActivePlan()` con lógica identical a ClickToEat.
- `BillingActivateExistingController` en `POST /api/admin/billing/activate-existing`.
- `StripeWebhookController::handleCheckoutCompleted` detecta `client_reference_id=tenant:{id}` para vincular sub a tenant existente.
- `ExpireManualTrialsCommand` (`php artisan trials:expire-manual`) + schedule diario 10:30.

### Visual redesign
- `apps/web/src/app/globals.css` con paleta ClickToBarber:
  - bg: warm-white `#FAFAF7`
  - primary: navy `#1E3A8A`
  - accent: cyan `#06B6D4`
  - `--cb-gradient` distintivo navy→cyan
- Nombres de variables retro-compat con upstream.

### Deploy
- `scripts/deploy-api.sh` + `scripts/deploy-web.sh` adaptados con paths/dominios ClickToBarber, rollback documentado.

### Tests
- Eliminados: `TwoFactorTest`, `EnforceTwoFactorTest`, `AuditLogObserverTest`, `WebPushPayloadTest`, `CustomDomainTest`.
- 21 suites Pest restantes.

### Smoke test local
- Composer install OK, npm install OK.
- `php artisan key:generate` OK.
- `php artisan migrate --seed` OK contra SQLite — 22 migraciones, 3 seeders demo.
- API en `http://127.0.0.1:8000/up` → HTTP 200.
- Web en `http://127.0.0.1:3000/` → HTTP 200.
- Tenants demo creados: `el-navajazo`, `marfil-avenue`.

### Documentación creada
- `docs/README.md` — entry point.
- `docs/architecture/overview.md`, `multi-tenancy.md`.
- `docs/features/whatsapp-hybrid.md`, `billing-trial-manual.md`.
- `docs/runbook/deploy-clicktobarber.md`, `activate-existing-trial.md`.
- `docs/decisions/ADR-001-mysql-over-postgres.md`, `ADR-002-whatsapp-hybrid.md`, `ADR-003-fork-cuts-vs-upstream.md`.

### Pendiente (próximas sesiones)
1. Logo SVG (`apps/web/src/components/Logo.tsx`) dibuja "LUMIA" literal — necesita rediseño.
2. Sweep visual de componentes (Preloader, landing hero, navbar) — algunos colores hardcoded.
3. Brand strings UI residuales (~50 referencias a "LUMIA"/"Lumia").
4. Tests Pest para `ActivateExisting` + `ExpireManualTrials`.
5. Endpoint `/billing/portal` (Stripe Customer Portal) — pendiente de portar de ClickToEat.

### Acciones humanas (Fernando) — bloquea go-live
1. DNS en hPanel: crear 2 subdominios.
2. MySQL en hPanel: crear DB + user.
3. Stripe Dashboard: 3 productos × 2 ciclos + webhook.
4. Buzón Hostinger Mail.

Ver [`SETUP_PRODUCCION.md`](SETUP_PRODUCCION.md) para detalle.

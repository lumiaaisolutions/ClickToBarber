# Proyecto: LUMIA — Software de barbería con identidad propia

> Documento maestro de contexto para Claude Code. Este archivo se carga automáticamente en cada sesión y define la visión, el stack, las reglas de negocio, el sistema visual y el log operativo del proyecto.
>
> **Renombrado 2026-04-28**: el producto pasó de "BarberPro" a **LUMIA** (más memorable, más old-money, alineado con la marca paraguas LUMIA AI Solutions).

---

## 1. Visión General

**LUMIA** es una plataforma SaaS multi-tenant que digitaliza la operación integral de barberías premium: agenda inteligente, gestión de personal, punto de venta, inventario, marketing de retención y finanzas. El producto opera bajo un modelo **Freemium / Suscripción escalonada**, donde **todas** las funcionalidades son visibles en la interfaz, pero las premium aparecen bloqueadas con un icono de candado para usuarios sin la suscripción correspondiente (estrategia de "deseo visible" para maximizar la conversión).

**White-label nativo**: cada barbería tiene su propia identidad visual (paleta, fuentes, logo) que aplica sólo a `/admin/*` y al link público `/b/{slug}`. La landing pública, el login y el checkout conservan la identidad LUMIA (verde botella + oro mate + marfil).

### 1.1 Portales

El sistema expone dos portales independientes con dominios visuales y de datos diferenciados:

1. **Portal Admin** — Dueño/Gerente de la barbería. Configuración de sucursal, gestión de barberos, agenda global, finanzas, marketing, suscripción.
2. **Portal Cliente** — Usuario final que reserva citas. Vista pública de la barbería, selección de servicio/barbero/horario, pago de depósito, historial de visitas.

### 1.2 Diferenciadores Clave

- **Anti No-Show con Circuit Breaker conversacional**: confirmación obligatoria 1 hora antes vía WhatsApp. Sin respuesta = cita cancelada + depósito retenido + llamada automatizada como último recurso.
- **Marketing de retención automatizado**: detección de clientes inactivos (>30 días) y envío de campañas personalizadas en un clic.
- **Multi-tenant nativo**: aislamiento estricto de datos por `tenant_id` en PostgreSQL con Row Level Security.
- **Experiencia "Pro Max"**: zero lag a 60 FPS, scrollytelling, SPA con transiciones cinematográficas.

---

## 2. Stack Tecnológico Detallado

### 2.1 Backend

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| Lenguaje / Framework | **Laravel 11+** (PHP 8.3+) | Ecosistema maduro, Sanctum/Queue/Horizon nativos |
| Arquitectura | **DDD + Screaming Architecture** | Dominios autónomos por bounded context |
| Base de Datos | **PostgreSQL 16** | RLS para multi-tenancy, JSONB, particionado |
| Cache / Queue / Locks | **Redis 7** | Circuit Breaker, Rate Limiting, sesiones, colas Horizon |
| API Gateway | **Kong** | Rate limiting global, routing, plugins de auth |
| Autenticación | **Laravel Sanctum** (token-based) + **JWT** para servicios internos | SPA + API |
| Workers | **Laravel Horizon** sobre Redis | Visibilidad de colas, retries, métricas |

### 2.2 Frontend

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| Framework | **Next.js 15** (App Router, RSC) | SSR/ISR, edge runtime, streaming |
| UI Library | **React 19** | Server Components, Suspense, transitions |
| Estilos | **Tailwind CSS 4** + **CSS Modules** para componentes críticos | Tokens de diseño + aislamiento |
| Estado | **Zustand** (cliente) + **TanStack Query** (servidor) | Mínimo boilerplate, cache inteligente |
| Animación | **Framer Motion** + **GSAP + ScrollTrigger** | Transiciones SPA + scrollytelling |
| 3D / Canvas | **Three.js** + **react-three-fiber** | Fondo dinámico reactivo al ratón |
| Smooth Scroll | **Lenis** | Inercia + integración GSAP |
| Forms | **React Hook Form** + **Zod** | Validación tipada compartida con backend |
| Iconos | **Lucide React** | Tree-shakeable, consistente |

### 2.3 Infraestructura y Observabilidad

| Capa | Tecnología |
|------|------------|
| Contenedores | Docker + Docker Compose (dev) / Kubernetes (prod) |
| CI/CD | GitHub Actions |
| Logs | Stack ELK o Grafana Loki |
| Métricas | Prometheus + Grafana |
| Tracing | OpenTelemetry |
| Pagos | Stripe (internacional) + MercadoPago (LATAM) |
| Mensajería | WhatsApp Business Cloud API (Meta) |
| Llamadas | Twilio Voice (fallback de confirmación) |

---

## 3. Arquitectura Multi-Tenant

### 3.1 Estrategia: **Shared Database + tenant_id + Row Level Security (RLS)**

- Cada tabla operativa incluye `tenant_id UUID NOT NULL`.
- Políticas RLS de PostgreSQL imponen el filtro a nivel de motor (defensa en profundidad).
- Un middleware de Laravel resuelve el tenant desde el JWT/Sanctum y lo inyecta como `SET LOCAL app.current_tenant`.
- Migraciones globales (planes, países, etc.) viven sin `tenant_id`.

### 3.2 Beneficios

- Costo operativo bajo vs. database-per-tenant.
- Aislamiento garantizado por motor, no solo por aplicación.
- Backup/restore unificado, métricas agregadas triviales.

---

## 4. Reglas de Negocio Críticas

### 4.1 Onboarding del Admin

1. Registro → verificación de email → selección de plan → pago Stripe/MercadoPago.
2. Alta de sucursal: nombre, dirección, geolocalización, horarios de operación, foto de portada.
3. Decisión: ¿solo el admin atiende, o se agregan barberos? Si agrega, alta de cada barbero con sus horarios individuales, servicios que ofrece y % de comisión.

### 4.2 Flujo de Reserva (Cliente)

1. Cliente accede a la URL pública de la barbería (`/b/{slug}`).
2. Selecciona servicio → barbero (o "el primero disponible") → fecha → slot.
3. Sistema valida disponibilidad en tiempo real (lock optimista en Redis).
4. Cliente paga **depósito** (% configurable por la barbería, default 30%).
5. Cita se crea con estado `pending_confirmation` y se inserta en el calendario del Admin.
6. Cliente recibe WhatsApp de confirmación inmediato.

### 4.3 Sistema de Notificaciones y Confirmación

| Momento | Canal | Acción |
|---------|-------|--------|
| T = creación | WhatsApp | Confirmación + recibo del depósito |
| T - 24h | WhatsApp | Recordatorio amigable |
| T - 2h | WhatsApp | **Recordatorio con botones**: Confirmar / Reagendar / Cancelar |
| T - 1h | Sistema | Si no hay confirmación → cancelación automática |
| T - 1h | WhatsApp + Twilio Voice | Notificación de cancelación + retención del depósito |

**Regla estricta**: el job de cancelación corre como `ScheduledJob` con lock distribuido en Redis para evitar doble ejecución en flota multi-worker.

### 4.4 Marketing de Retención

- Query programada diaria: clientes con `last_visit_at < NOW() - INTERVAL '30 days'`.
- Vista en Admin con segmentación (gasto promedio, servicio favorito).
- Acción "un clic": disparar campaña WhatsApp con plantilla aprobada por Meta + cupón único trazable.

### 4.5 Finanzas

- Registro automático de cada cobro (servicio, producto, depósito, propina).
- Cierre de caja diario por barbero (efectivo vs. digital).
- Cálculo automático de comisiones por barbero con regla configurable.
- Exportación contable (CSV, PDF).

### 4.6 Punto de Venta e Inventario

- POS integrado al check-out post-servicio: agrega productos al ticket.
- Inventario con stock mínimo, alertas, costo promedio ponderado.
- Cada venta de producto descuenta stock atómicamente (transacción + lock).

---

## 5. Sistema de Candados (Freemium UI)

### 5.1 Principio

> **Toda funcionalidad premium se RENDERIZA, pero se BLOQUEA visualmente.**

El usuario ve lo que se está perdiendo → fricción de deseo → conversión.

### 5.2 Implementación Frontend

```tsx
<FeatureGate feature="marketing.campaigns">
  <CampaignBuilder />
</FeatureGate>
```

- Si el plan del tenant no incluye `marketing.campaigns`:
  - El componente hijo se renderiza con `pointer-events: none` + `filter: blur(4px) grayscale(0.6)`.
  - Overlay con icono de candado (Lucide `Lock`), nombre del plan requerido y CTA "Mejorar plan".
  - Tooltip con preview del beneficio al hover.

### 5.3 Implementación Backend

- Middleware `EnsureFeatureEnabled` que valida contra `tenants.subscription.features[]` antes de ejecutar el controlador.
- Respuesta `402 Payment Required` con payload estructurado (`required_plan`, `upgrade_url`).
- **Defensa en profundidad**: nunca confiar solo en el gate frontend.

### 5.4 Catálogo de Features (planes)

| Feature | Free | Starter | Pro | Enterprise |
|---------|:----:|:-------:|:---:|:----------:|
| Agenda + 1 barbero | ✅ | ✅ | ✅ | ✅ |
| Reservas online | ✅ | ✅ | ✅ | ✅ |
| Múltiples barberos (hasta 5) | 🔒 | ✅ | ✅ | ✅ |
| Barberos ilimitados | 🔒 | 🔒 | ✅ | ✅ |
| Notificaciones WhatsApp | 🔒 | ✅ | ✅ | ✅ |
| Llamada automatizada (Twilio) | 🔒 | 🔒 | ✅ | ✅ |
| POS + Inventario | 🔒 | 🔒 | ✅ | ✅ |
| Marketing de retención | 🔒 | 🔒 | ✅ | ✅ |
| Reportes avanzados + API | 🔒 | 🔒 | 🔒 | ✅ |
| Multi-sucursal | 🔒 | 🔒 | 🔒 | ✅ |

---

## 6. Sistema Visual (Design System)

> **Nota (2026-04-28):** la identidad visual fue refundida de "Dark Premium" a
> "Old Money Light". El antiguo dark queda preservado como preset opcional
> `carbon-premium` para tenants que lo elijan.

### 6.1 Paleta LUMIA Old Money — base inmutable

Inspirada en clubs privados de Mayfair, papel manila y latón envejecido.
Estos tokens viven en `:root` de `frontend/src/app/globals.css` y **nunca**
se sobrescriben globalmente. Por tenant se sobrescriben sólo las variables
`--tenant-*` y `--primary` / `--accent` vía `<BrandingProvider>` scoped.

```css
:root {
  /* Base — Marfil & papel manila */
  --bg-canvas:   #FBF7EE;  /* Fondo absoluto */
  --bg-paper:    #F5EFE0;  /* Cards primarias */
  --bg-vellum:   #EDE5D2;  /* Cards elevadas / modales */
  --bg-sage:     #E4DCC6;  /* Hover / divisores cálidos */

  /* Tinta */
  --ink:         #1A1F1B;  /* Tinta verdosa principal */
  --ink-2:       #4A4F45;
  --ink-muted:   #8A8B7E;
  --ink-on-accent: #FBF7EE;

  /* Primario — Verde botella */
  --primary:     #1F3D2B;
  --primary-2:   #2D5240;
  --primary-3:   #14281C;

  /* Acento — Oro mate envejecido */
  --accent:      #B8935E;
  --accent-2:    #C9A878;
  --accent-3:    #8E6D40;

  /* Secundario — Navy clásico */
  --navy:        #1A2F4F;

  /* Estados */
  --success: #3F6B4F;  --warning: #B8853A;
  --danger:  #9C4039;  --info:    #3F5A7A;

  /* Hairlines */
  --line-fine:   rgba(26, 31, 27, 0.08);
  --line-medium: rgba(26, 31, 27, 0.16);
  --line-strong: rgba(31, 61, 43, 0.32);

  /* Variables de tenant (sobrescritas por BrandingProvider) */
  --tenant-primary: var(--primary);
  --tenant-accent:  var(--accent);
  --tenant-radius:  14px;
  --tenant-density: 1;
}
```

### 6.2 Presets de identidad por tenant

Cuatro paletas curadas (ver `docs/PRESETS.md`):

1. **`old-money-emerald`** — Verde botella + oro mate (default LUMIA).
2. **`ivory-brass`** — Marfil cálido + latón pulido (modo sépia).
3. **`navy-classic`** — Navy medianoche + plata vieja.
4. **`carbon-premium`** — Carbón profundo + latón (modo dark, legado).

El admin elige y ajusta desde el wizard de onboarding o `/admin/identity`.
Los detalles técnicos del white-labeling están en
`.claude-skills/branding-tokens.md`.

### 6.3 Tipografía

- **Display / Hero**: `"Cormorant Garamond"` italic — pesos 400 / 500 / 600 / 700.
- **UI / Body**: `"Inter Tight"` — pesos 400 / 500 / 600 / 700.
- **Numérico tabular**: `"JetBrains Mono"` para finanzas y agenda.

Tracking signature: `.tracking-imperial` (0.22em uppercase) y
`.tracking-noble` (0.08em) — usar en eyebrows, labels y links de navegación.

### 6.4 Principios de Movimiento

- **Easing por defecto**: `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo) — más
  sutil que el antiguo out-quint. Premium sin dramatismo.
- **Duración**: micro (120ms), corta (240ms), media (420ms), narrativa
  (680ms+). Para reveals y transiciones de página: 780-1100ms.
- **Stagger**: 40-80ms entre elementos hermanos.
- **Hover signature** (firma de marca): `letter-spacing` aumenta de 0.04em a
  0.08em en links y botones. Implementado como `.hover-spread`.
- **Reveals**: `clip-path` en lugar de `translateY` cuando se trate de
  marquesinas tipográficas (más elegante).
- **Todo lo no-CSS pasa por `requestAnimationFrame`** — prohibido
  `setInterval`/`setTimeout` para animación.

### 6.5 Logo

`<Logo />` y `<LogoMark />` viven en `frontend/src/components/Logo.tsx`.
Wordmark "lumia" en italic Cormorant con la "i" cuyo punto natural se
reemplaza por una tijera estilizada (mangos circulares + hojas cruzadas).
Usa `currentColor` — pintar con `text-primary` en cualquier contexto.
Anima el grupo `.scissor` con un giro sutil al hover (apertura de tijera).

---

## 7. Estructura de Carpetas (Screaming Architecture)

```
/
├── claude.md                              ← este archivo
├── .claude-skills/
│   ├── architecture-rules.md
│   └── circuit-breaker.md
├── backend/                               ← Laravel
│   └── app/
│       ├── Domain/
│       │   ├── Tenancy/
│       │   ├── Identity/
│       │   ├── Scheduling/                ← Agenda, slots, disponibilidad
│       │   ├── Appointments/              ← Citas, confirmación, no-show
│       │   ├── Staff/                     ← Barberos, horarios, comisiones
│       │   ├── Catalog/                   ← Servicios, productos
│       │   ├── PointOfSale/               ← POS, tickets
│       │   ├── Inventory/                 ← Stock, movimientos
│       │   ├── Billing/                   ← Suscripciones, pagos a la plataforma
│       │   ├── Payments/                  ← Cobros a clientes finales (Stripe/MP)
│       │   ├── Notifications/             ← WhatsApp, Email, Voice
│       │   ├── Marketing/                 ← Retención, campañas, cupones
│       │   ├── Finance/                   ← Cierre de caja, reportes
│       │   └── Subscriptions/             ← Planes, features, gates
│       ├── Infrastructure/
│       │   ├── CircuitBreaker/
│       │   ├── RateLimit/
│       │   ├── Persistence/
│       │   └── Integrations/              ← Stripe, MercadoPago, Meta, Twilio
│       └── Http/
│           ├── Admin/
│           └── Client/
└── frontend/                              ← Next.js
    └── src/
        ├── app/
        │   ├── (admin)/
        │   ├── (client)/
        │   └── (marketing)/
        └── domains/
            ├── scheduling/
            ├── appointments/
            ├── staff/
            ├── pos/
            ├── marketing/
            └── finance/
```

---

## 8. Estándares de Seguridad

- **SQL Injection**: Eloquent + Query Builder con bindings. Prohibido `DB::raw()` con interpolación.
- **N+1**: `with()` obligatorio + `Model::preventLazyLoading()` en producción.
- **XSS**: Blade auto-escape; React escapa por defecto. `dangerouslySetInnerHTML` requiere sanitización con DOMPurify.
- **CSRF**: Sanctum con cookies SameSite=Lax para SPA.
- **Rate Limiting**: 100 req/min por IP global vía Kong + middleware Laravel por endpoint sensible.
- **Secrets**: Vault o `.env` cifrado, nunca en repo.
- **Webhooks**: validación de firma HMAC obligatoria (Stripe, Meta, Twilio).
- **PII**: cifrado en reposo para teléfonos/emails de clientes finales (Laravel Crypt + columna `encrypted`).

---

## 9. Performance Targets (Frontend)

| Métrica | Objetivo |
|---------|----------|
| LCP | < 1.8s |
| INP | < 200ms |
| CLS | < 0.05 |
| FPS animaciones | 60 sostenidos |
| Bundle inicial admin | < 180KB gzipped |
| TTI portal cliente | < 2.5s en 4G |

---

## 10. Log de Errores y Soluciones

> Sección viva. Se actualiza al cierre de cada tarea de desarrollo. Formato: fecha, contexto, error, causa raíz, solución, prevención futura.

### Plantilla

```
### [YYYY-MM-DD] Título corto del incidente
- **Contexto**: dónde y cuándo apareció
- **Error**: mensaje exacto / síntoma
- **Causa raíz**: análisis técnico
- **Solución**: qué se hizo
- **Prevención**: regla, test o monitoreo agregado
```

### Entradas

### [2026-04-28] Refundición visual a Old Money — paleta, logo, fuentes
- **Contexto**: Tarea 3, refundición completa de la identidad visual y rebranding a LUMIA. La paleta antigua (carbón + latón + bordeaux) se conservó como preset opcional `carbon-premium`.
- **Error**: N/A (no fue un bug, fue refactor mayor controlado).
- **Causa raíz**: Decisión de producto: cambiar a old-money light + white-label por tenant, alineado con la marca paraguas LUMIA AI Solutions.
- **Solución**:
  - `globals.css` reescrito con tokens `--bg-canvas/paper/vellum/sage`, `--ink/-2/-muted`, `--primary/-2/-3`, `--accent/-2/-3`, `--line-fine/medium/strong`. Modos `light/sepia/dark` vía atributo `data-mode`.
  - Fuentes nuevas: Cormorant Garamond (display italic) + Inter Tight (UI) + JetBrains Mono (numérico). Cargadas vía `next/font/google`.
  - Logo nuevo: wordmark "lumia" italic con tijera SVG estilizada como punto de la "i". `LogoMark` (sólo tijera) para favicons/sidebar colapsado.
  - Easing default cambió a `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo). Nueva utilidad `.hover-spread` (letter-spacing 0.04→0.08em al hover).
  - Sección "Presets" añadida a la landing con las 4 paletas.
- **Prevención**: cualquier color hardcoded fuera de `globals.css` debe pasar code-review. Nuevos componentes deben usar tokens (`text-primary`, `bg-bg-paper`, etc.) o vars (`var(--tenant-primary)`). El branding por tenant **nunca** debe sobrescribir `:root` global — siempre scoped al subtree del `<BrandingProvider>`.

### [2026-04-28] tenant_branding + roles ampliados + wizard onboarding
- **Contexto**: Tarea 3 — feature mayor para soportar white-label dinámico y matriz de roles (admin/manager/receptionist/barber).
- **Solución**:
  - Migración `tenant_branding` (1-1 con tenants). Modelo `App\Domain\Tenancy\Models\TenantBranding`.
  - Migración `users.first_login_at` para forzar wizard la primera vez.
  - Middleware `EnsureRole` (alias `role:`) — registrado en `bootstrap/app.php`. `platform_owner` bypassa.
  - Constants nuevos en `User`: `ROLE_MANAGER`, `ROLE_RECEPTIONIST`, helpers `canWrite()` / `canSeeFinance()`.
  - `BrandingController`: GET/PUT `/admin/branding`, GET público `/tenant/{slug}/branding`, POST `/admin/onboarding/complete`.
  - Frontend: `<BrandingProvider>` que inyecta CSS variables scoped al subtree (cero contaminación entre sesiones paralelas). `OnboardingWizard` 4-pasos. `BrandingEditor` para cambios posteriores.
  - Seeder `OnboardingDemoSeeder`: tenant `marfil-avenue` con admin sin first_login_at para demostrar el wizard.
- **Prevención**: documentar en `.claude-skills/branding-tokens.md` por qué CSS scoping en lugar de :root override (evita race condition entre tenants en SSR/edge cache).

### [2026-04-26] SQLite — pivot `barber_service.tenant_id` violaba NOT NULL en seeder
- **Contexto**: Primer `migrate:fresh --seed`. El seeder `DemoTenantSeeder` asocia servicios a barberos con `$barber->services()->sync($ids)`.
- **Error**: `SQLSTATE[23000] NOT NULL constraint failed: barber_service.tenant_id`.
- **Causa raíz**: La tabla pivot `barber_service` requiere `tenant_id` (multi-tenant), pero `BelongsToMany::sync()` no popula columnas extras del pivot a menos que se le pase como segundo dimension del array.
- **Solución**: Pasar el tenant en el sync: `$barber->services()->sync($services->mapWithKeys(fn($s) => [$s->id => ['tenant_id' => $tenant->id]])->all())`. Adicionalmente se agregó `tenant_id` a `withPivot()` en la relación.
- **Prevención**: Para todas las tablas pivot tenant-scoped, registrar `withPivot('tenant_id')` en la relación y siempre usar el formato `[id => ['extra' => valor]]` al hacer sync.

### [2026-04-26] AvailabilityController pasaba `Illuminate\Support\Stringable` a Carbon::parse
- **Contexto**: Endpoint `GET /api/client/availability` lanzando 500 al consultar slots desde el frontend.
- **Error**: `TypeError: Carbon\CarbonImmutable::parse(): Argument #1 ($time) must be of type ... string|... given Illuminate\Support\Stringable`.
- **Causa raíz**: `$request->string('date')` devuelve un objeto `Stringable`, no un `string`. Carbon en versión instalada no acepta el cast implícito.
- **Solución**: Forzar `->toString()` en el controlador.
- **Prevención**: En todos los `FormRequest`/controladores donde se pase un valor al dominio, usar `->toString()` explícito o cast `(string)`. Un test feature por endpoint catchea esto.

### [2026-04-29] Error 419 al crear cita desde `/b/{slug}` (Sanctum statefulApi vs Bearer)
- **Contexto**: BookingFlow del cliente público enviaba `POST /api/client/appointments` y recibía `419 Page Expired` justo antes del paso "Confirmar reserva".
- **Error**: respuesta 419 (Laravel TokenMismatchException) — el endpoint público estaba siendo tratado como ruta web protegida por CSRF.
- **Causa raíz**: `bootstrap/app.php` tenía `$middleware->statefulApi()`, que añade `EnsureFrontendRequestsAreStateful` a TODAS las rutas `/api/*`. Sanctum considera `localhost`, `127.0.0.1`, `::1` y dominios listados en `sanctum.stateful` como "stateful" y para esas requests aplica el stack web (sesión + VerifyCsrfToken). Como la SPA habla con el backend vía Bearer tokens (no cookies SPA), el modo stateful no aporta nada y rompe los endpoints públicos sin token CSRF.
- **Solución**: removido `statefulApi()` del kernel. La autenticación queda 100% Bearer (Sanctum personal access tokens reenviados desde cookie httpOnly por route handlers de Next.js).
- **Prevención**: cuando la SPA hable con el backend por Bearer (no cookie SPA), **nunca** invocar `statefulApi()`. Documentado in-place con comentario explícito en `bootstrap/app.php`. Test mínimo: `curl -X POST /api/client/appointments` sin headers → debe responder 422 (validación) o 201 (creado), nunca 419.

### [2026-04-29] Loop "history.replaceState() more than 100 times per 10 seconds" en `/login`
- **Contexto**: tras expirar un token Sanctum (cookie `bp_token` aún en el navegador), abrir `/login` o `/admin` colgaba el navegador con `Runtime SecurityError`.
- **Error**: el browser DevTools mostraba `Attempt to use history.replaceState() more than 100 times per 10 seconds` con stack en `replaceState [native code]`. El navegador aborta automáticamente el loop por seguridad.
- **Causa raíz**: el ciclo de redirects era:
    1. `/admin/layout.tsx` veía cookie + `/auth/me` devolvía 401 → `redirect("/login")`
    2. `/login/page.tsx` veía la misma cookie (no la había borrado nadie) → `redirect("/admin")`
    3. → vuelta al paso 1, infinito.
  Adicionalmente, `LoginForm` construía URLs `/admin/${slug}/onboarding` que no existen como rutas (el árbol no usa `[slug]`), generando 404 en client-side navigation.
- **Solución**:
  - `/api/auth/logout/route.ts` ahora también acepta `GET`: borra `AUTH_COOKIE` y `TENANT_COOKIE` y redirige (303) a `/login`.
  - `/admin/layout.tsx` en estado `unauthorized` redirige a `/api/auth/logout` (que limpia y luego va a `/login`), en lugar de directo a `/login` con la cookie sucia.
  - `/login/page.tsx` y `/admin/login/page.tsx` validan la sesión con `/auth/me` ANTES de redirigir a `/admin` — si la cookie es inválida, muestran el form en lugar de seguir empujando al admin.
  - `LoginForm` redirige a `/admin/onboarding` o `/admin` (sin slug en URL).
- **Prevención**: regla — un Server Component **nunca** debe redirigir basado sólo en la presencia de la cookie. Siempre validar contra el backend. Si la cookie está y la sesión es inválida, pasar por un route handler que la borre antes de redirigir.

### [2026-04-29] Background task daemon mataba `npm run dev` al cerrar el handle
- **Contexto**: `npm run dev` arrancado vía `Bash(run_in_background=true)` se reportaba como `completed` con exit code 0 a los pocos segundos, pese a que el proceso seguía vivo brevemente. Volvía a aparecer otro proceso (huérfano, ver siguiente entrada) en :3000.
- **Causa raíz**: el daemon que supervisa los background tasks de la herramienta cierra el shell padre cuando la tarea se "completa", lo que envía SIGTERM al hijo `next dev`. Para procesos largos como un dev server, esto los mata silenciosamente.
- **Solución**: arrancar con `nohup npm run dev > /tmp/lumia-frontend.log 2>&1 & disown`. `nohup` ignora SIGHUP, `disown` lo desliga del job table del shell, y `&` lo manda al background sin atarlo al daemon de tareas.
- **Prevención**: en futuras sesiones, dev servers largos (Next.js, Vite, Laravel `php artisan serve` extendido) se levantan con `nohup ... & disown`. Logs van a `/tmp/lumia-*.log`. La señal de éxito es `lsof -ti:PORT` mostrando el PID, no el output del daemon.

### [2026-04-29] Otro proyecto (`opticatc-next`) ocupaba `:3000` como huérfano (PPID=1)
- **Contexto**: tras matar el dev server de Barberia, `localhost:3000` seguía sirviendo HTML de OpticaTC. Al relanzar Barberia, Next.js lo movía a `:3001` con el aviso `Port 3000 is in use by process 42800, using available port 3001 instead`.
- **Causa raíz**: el usuario tenía `next-server` de `/Users/fernandotorres/Desktop/LUMIA/opticatc-next/apps/web` corriendo huérfano (`ppid=1` → adoptado por launchd después de cerrar la terminal padre). NO había supervisor que lo respawneara — simplemente sobrevivía al cierre de su shell.
- **Solución**: identificar todo el árbol con `ps -o pid,ppid,command -p $(lsof -ti:3000)`, subir hasta encontrar el `node`/`npm` original, y `kill -9` al árbol completo. Verificar con `lsof -ti:3000` que queda libre antes de lanzar Barberia.
- **Prevención**: antes de arrancar dev servers, ejecutar `lsof -ti:3000 :8000` y matar cualquier proceso huérfano. Documentar en `README.md` que el puerto 3000 lo usa LUMIA y debe estar libre.

### [2026-04-29] LandingPricing tenía bugs visuales y diseño tosco
- **Contexto**: el panel de planes en `/precios` y la home tenía cards de altura desigual, badge "Más elegido" superpuesto al borde por usar `border-2 border-primary`, y una lista de 16 features con tachados+candados que se sentía pesada y negativa.
- **Solución (refactor visual)**:
  - Toggle Mensual / Anual (−20%) con estado en cliente.
  - Cards uniformes con `border` sutil; el plan "Pro" se distingue con `ring-1` suave + shadow ambiental, no con border grueso.
  - Badge contextual en esquina superior derecha (Pro → "Más elegido", Enterprise → "Para cadenas") sin tapar el header.
  - Sólo se listan features INCLUIDOS (sin tachados, sin candados). Las features premium (POS, Marketing) usan `text-ink` pleno; el resto `text-ink-2` para guiar la vista.
  - Precio gigante con `MXN / mes` en líneas pequeñas.
- **Prevención**: para listas largas de features comparativas, mostrar sólo positivos por columna en lugar de columnas matriciales con tachados — la jerarquía visual se rompe rápido y comunica lo equivocado (lo que NO tiene). Si necesitas comparativa total, usar tabla aparte tipo "all features matrix".

---

## 11. Contexto Importante para Próxima Sesión

> Resumen ejecutivo que se actualiza al cierre de cada tarea para que la siguiente sesión arranque con cero ramp-up.

### Estado actual (al cierre de Tarea 3.1 — 2026-04-29)

> Tarea 3 (refundición visual + branding + roles + CRUD) cerrada el 2026-04-28.
> Tarea 3.1 (round de fixes post-feedback del usuario) cerrada el 2026-04-29 —
> arregla 419 al reservar, loop replaceState en /login y rediseña el panel de
> planes. Sin cambios funcionales nuevos: sólo bugfix + polish visual.

#### Refundición visual y rebranding a LUMIA

- **Identidad LUMIA Old Money** aplicada como base inmutable: paleta marfil + verde botella + oro mate + navy. Modos `light` (default), `sepia` y `dark` vía atributo `data-mode`. Tipografía Cormorant Garamond italic + Inter Tight + JetBrains Mono.
- **Logo nuevo**: wordmark "lumia" italic con tijera SVG como punto de la "i". `<Logo>` y `<LogoMark>` en `frontend/src/components/Logo.tsx`. Color heredado de `currentColor` para fácil customización.
- **Landing pública (`/`, `/precios`, `/login`)** completamente reescrita con la nueva identidad: hero, sección Presets (4 cards visuales con previews), Features, Anti-No-Show vertical timeline, Pricing con módulos por rol, Footer.
- **`/b/{slug}` y `/admin/*`** envueltos en `<BrandingProvider>` que inyecta CSS variables scoped al subtree (cero contaminación entre sesiones paralelas). El link público lleva siempre footer "Powered by LUMIA" → https://lumiaaisolutions.com.
- **Animaciones old-money**: easing `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo), `.hover-spread` (letter-spacing 0.04→0.08em), `.reveal-clip` con `clip-path`, motion staggered con delays 40-80ms.

#### Backend

- **Tabla `tenant_branding`** (1-1 con tenants) — preset, primary/accent_color, font_display/body, radius, density, mode, logo_url, public_tagline, admin_display_name.
- **Columna `users.first_login_at`** — NULL fuerza wizard de onboarding.
- **Roles ampliados**: `platform_owner`, `admin`, `manager`, `receptionist`, `barber`, `client` (sólo los 5 primeros entran al portal). `User::canWrite()` y `User::canSeeFinance()` para checks programáticos.
- **Middleware `EnsureRole`** (`role:admin,manager`). `platform_owner` bypassa siempre. Registrado en `bootstrap/app.php`.
- **`BrandingController`**: `GET/PUT /admin/branding`, `POST /admin/onboarding/complete`, `GET /tenant/{slug}/branding` (público).
- **CRUD endpoints**: Staff (`POST/PUT/DELETE /admin/staff/{id}` + `GET/PUT /admin/staff/me/schedule` para barberos), Services (`POST/PUT/DELETE /admin/catalog/services/{id}`), Products (`POST/PUT/DELETE /admin/catalog/products/{id}` con feature gate `pos_inventory`).

#### Frontend

- **`<BrandingProvider>`** + hook `useBranding()` en `frontend/src/components/branding/`.
- **`OnboardingWizard`** (4 pasos: Negocio → Preset → Detalles → Logo) con preview en vivo. Se monta en `/admin/onboarding` cuando `first_login_at = null`.
- **`BrandingEditor`** en `/admin/identity` — editor permanente del branding con preview live.
- **`StaffClient`** y **`ServicesClient`** — Client Components con CRUD condicional al rol. Vista barbero "mis horarios" inline cuando `role === 'barber'`.
- **Route handlers proxy** en `frontend/src/app/api/admin/{branding,onboarding/complete,staff,staff/[id],staff/me/schedule,services,services/[id]}` que forwardean el Bearer Sanctum desde la cookie httpOnly.

#### Demo accounts

```
admin@elnavajazo.test      / password   → admin (CRUD completo, onboarding hecho)
gerencia@elnavajazo.test   / password   → manager
recepcion@elnavajazo.test  / password   → receptionist
diego@elnavajazo.test      / password   → barber (sólo "mis horarios")
admin@marfil.test          / password   → admin SIN onboarding (wizard demo)
```

#### Fixes incluidos en Tarea 3.1 (2026-04-29)

- **419 al reservar cita** — removido `statefulApi()` del kernel (la SPA usa Bearer, no cookies SPA). Verificado: `POST /api/client/appointments` responde 201.
- **Loop `replaceState` en `/login`** — `/api/auth/logout` ahora acepta `GET` y limpia cookie antes de redirigir; `/admin/layout` pasa por ahí en `unauthorized`; `/login` y `/admin/login` validan sesión real con `/auth/me` antes de redirigir; `LoginForm` ya no construye URLs `[slug]` inexistentes.
- **Rediseño LandingPricing** — toggle Mensual/Anual (−20%), cards uniformes, badge contextual sin overlap, sólo features incluidos.
- **Operacional** — `lumia-frontend.log` en `/tmp/`. Dev servers se arrancan con `nohup npm run dev > /tmp/lumia-frontend.log 2>&1 & disown` para sobrevivir al daemon de background tasks.

#### Stack en ejecución verificado

- Laravel API en `:8000` (Bearer auth, sin statefulApi).
- Next.js dev server en `:3000` (Barberia, no OpticaTC). Si ves OpticaTC, mata su árbol con `kill -9 $(lsof -ti:3000)` y relanza.
- `migrate:fresh --seed` corre limpio, incluye 5 demo accounts con roles distintos.
- Endpoints verificados con 200/201: `/`, `/login`, `/precios`, `/b/el-navajazo`, `/api/tenant/el-navajazo/branding`, `POST /api/client/appointments`.

#### Siguiente paso lógico (Tarea 4)

1. **Pago + provisión**: integrar Stripe Checkout en `/precios`, webhook que crea tenant + usuario admin + envía credenciales por email. Hoy el alta es manual ("nuestro equipo te contacta").
2. **CRUD restantes en UI**: Productos (POS) — los endpoints existen, falta `ProductsClient.tsx` similar a `ServicesClient`. Citas desde admin (agendar manual). Cupones del marketing.
3. **Permisos finos en UI** del resto de pages (Marketing, Finance, Agenda, POS) para esconder acciones según `can_write` / `can_see_finance` que ya devuelve `/auth/me`.
4. **Tests Pest**: smoke por endpoint CRUD + tests de roles (cada rol contra cada endpoint protegido por `role:`).
5. **Migrar a PostgreSQL** real con RLS activado (las migraciones ya están listas en `2026_04_27_000001_enable_rls_for_tenant_tables.php`).
6. **Editor visual de horarios de barbería** (BusinessHours) — hoy se editan sólo desde el seeder.

#### Pendientes manuales (necesitan acción del usuario)

- Configurar credenciales reales de WhatsApp Cloud API, Stripe, MercadoPago y Twilio (todos en `LogDriver`/`MockGateway` por defecto en local).
- Levantar `docker compose up -d` si quieres usar PostgreSQL/Redis en lugar de SQLite/cache file.
- Subir un logo SVG/PNG real para el tenant demo `el-navajazo` (actualmente sólo aparece el wordmark LUMIA).
- Si reinicias y `:3000` está ocupado por otro proyecto: `kill -9 $(lsof -ti:3000)` y relanza Barberia.

#### Riesgos a vigilar

- Cualquier color hardcoded fuera de `globals.css` rompe el sistema de presets — pasarlo a token o `var(--tenant-*)`.
- `BrandingProvider` debe envolver SIEMPRE el subtree de `/admin/*` y `/b/{slug}`. Nunca se aplica a la landing pública (debería conservar identidad LUMIA fija).
- **Nunca** invocar `$middleware->statefulApi()` en `bootstrap/app.php` mientras la SPA use Bearer tokens — rompe rutas públicas con 419 (ver §10 entrada del 2026-04-29).
- Server Components nunca deben redirigir basado sólo en presencia de cookie — siempre validar con `/auth/me` o redirigir al route handler `/api/auth/logout` que la limpia (ver §10 loop replaceState).
- Si añades migración con tabla nueva tenant-scoped, recuerda el trait `BelongsToTenant` y, en PostgreSQL, política RLS.
- `Model::preventLazyLoading(true)` está activo fuera de producción → cualquier lazy load lanza excepción.
- El driver de WhatsApp por defecto es `LogWhatsappClient` → envíos en `storage/logs/laravel.log`.

---

## 12. Protocolo de Cierre de Sesión

Al final de cada tarea de desarrollo, Claude DEBE:

1. Actualizar §10 con cualquier incidente encontrado y su resolución.
2. Reescribir §11 con el nuevo estado y siguiente paso lógico.
3. Proporcionar comandos `git add` + `git commit` siguiendo **Conventional Commits** (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`, `perf:`, `build:`, `ci:`).

---

## 13. Comandos Git pendientes (Tarea 2)

Ejecuta esto en `~/Desktop/Barberia` (el repo aún no está inicializado):

```bash
cd ~/Desktop/Barberia
git init -b main

# Commit 1 — Documentación arquitectónica (Tarea 1)
git add claude.md .claude-skills/architecture-rules.md .claude-skills/circuit-breaker.md .gitignore README.md
git commit -m "$(cat <<'EOF'
docs(architecture): inicializa documentación maestra de BarberPro SaaS

Añade claude.md, architecture-rules.md y circuit-breaker.md con la visión,
estructura DDD, sistema Freemium con candados y patrón Circuit Breaker
basado en Redis con scripts Lua atómicos.
EOF
)"

# Commit 2 — Infra Docker + tooling
git add docker-compose.yml infra/postgres/init.sql Makefile
git commit -m "$(cat <<'EOF'
chore(infra): añade docker-compose con PostgreSQL 16 + Redis 7 + Mailpit

Incluye script init.sql con extensiones uuid-ossp/pgcrypto/citext y un
Makefile con targets para levantar la base, instalar deps y arrancar
backend/frontend en dev.
EOF
)"

# Commit 3 — Backend Laravel DDD completo
git add backend/
git commit -m "$(cat <<'EOF'
feat(backend): scaffolding Laravel 11 con DDD y casos de uso del dominio

- 14 bounded contexts en app/Domain/* siguiendo Screaming Architecture
- Trait BelongsToTenant + TenantScope global para multi-tenancy
- Migraciones para tenants, plans, users, barbers, services, products,
  appointments, payments, tickets, notifications_log, campaigns y coupons
- Servicios: BookAppointment, ConfirmAppointment, CancelAppointment,
  SendWhatsapp (con CircuitBreaker), AvailabilityCalculator, RetentionScan
- Circuit Breaker Redis con scripts Lua atómicos
- Middlewares ResolveTenant, EnsureFeatureEnabled (402), RateLimitByIp
- API REST: /api/client/*, /api/admin/* con feature gates Pro/Enterprise
- Seeders: tenant demo "El Navajazo" con plan Pro, 3 barberos, 8 servicios,
  12 productos, 50 clientes (16 inactivos +30d), 30 citas variadas
- Sanctum instalado para futuro login admin
EOF
)"

# Commit 4 — Frontend Next.js premium
git add frontend/
git commit -m "$(cat <<'EOF'
feat(frontend): portal Admin + Cliente con UI premium dark

- Next.js 16 + React 19 + Tailwind 4 + TypeScript
- Paleta dark premium (carbón + latón + bordeaux) con tokens CSS
- Tipografía Fraunces (display) + Inter (UI) + JetBrains Mono (numérico)
- Preloader con logo breathing, fondo Three.js reactivo al ratón
- Smooth scroll con Lenis, scrollytelling horizontal GSAP+ScrollTrigger
  (anti no-show storytelling), transiciones Framer Motion
- Componente FeatureGate con blur + candado + CTA upgrade
- Landing marketing con hero, features, planes (con datos del API)
- Portal público /b/[slug] con BookingFlow de 5 pasos contra el API
- Portal /admin completo: Dashboard, Agenda, Staff, Servicios, POS,
  Marketing (composer WhatsApp), Finanzas (gated Enterprise), Billing
- Cliente HTTP con manejo de FeatureLockedError (402) y RateLimited (429)
EOF
)"

# Verifica
git log --oneline
```

> Después de los 4 commits, la rama `main` queda lista para push (no incluido por seguridad — el usuario decide remoto).

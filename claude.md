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

Seis paletas curadas (ver `docs/PRESETS.md`), cada una con variante light **y**
dark sincronizadas. Refundidas el 2026-05-05 (port del sistema Lumina):

1. **`champagne`** — Cálido y discreto, premium clásico neutral.
2. **`emerald`** — Verde botella + oro mate (**default LUMIA**, antes `old-money-emerald`).
3. **`terracotta`** — Cálido y artesanal, latina/mediterránea.
4. **`midnight`** — Sofisticado y nocturno, formal.
5. **`rose`** — Refinado y boutique, salones unisex.
6. **`forest`** — Sobrio y profundo, barbershops tradicionales.

Cada preset trae 15 tokens cromáticos (bg/surface/elevated/ink/.../accent/states)
en lugar de los 2 colores anteriores. El admin elige y ajusta desde el wizard
de onboarding o `/admin/identity` (4 paneles: Identidad / Paleta / Tipografía
/ Layout) con vista previa en vivo.

- Detalle de presets → `docs/PRESETS.md`.
- Arquitectura completa (data model, adapter, live-preview store, BrandingProvider) → `docs/IDENTITY_SYSTEM.md`.
- Convenciones rápidas de white-label → `.claude-skills/branding-tokens.md`.

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

### [2026-05-05] Auditoría de production readiness — punch-list de bloqueantes
- **Contexto**: sesión de planning post-Tarea 3.1 antes de empezar Tarea 4. El usuario pidió "qué falta para subirlo a producción".
- **Error**: N/A (no fue un bug, fue auditoría).
- **Causa raíz**: el producto está visualmente refundido y funcional en local con drivers mock, pero faltan piezas estructurales para SaaS multi-tenant cobrable: pagos reales, RLS activo, integraciones reales (WhatsApp/Twilio/Stripe), cifrado PII, hardening y observabilidad.
- **Solución**: creado `docs/PRODUCTION_READINESS.md` como fuente de verdad. Contiene 6 bloqueantes (B1-B6) con archivos a tocar y criterios de aceptación, 6 importantes (I1-I6), quick wins, orden de ejecución sugerido, matriz de riesgos y comandos para retomar la sesión en otra máquina. `.claude/` añadido al `.gitignore` (config local de Claude Code, no se comparte entre equipos).
- **Prevención**: cualquier decisión arquitectónica tomada para preparar producción se documenta primero en `PRODUCTION_READINESS.md` y luego se implementa. Un bloqueante no se cierra hasta que su criterio de aceptación esté verificado.

### [2026-04-29] LandingPricing tenía bugs visuales y diseño tosco
- **Contexto**: el panel de planes en `/precios` y la home tenía cards de altura desigual, badge "Más elegido" superpuesto al borde por usar `border-2 border-primary`, y una lista de 16 features con tachados+candados que se sentía pesada y negativa.
- **Solución (refactor visual)**:
  - Toggle Mensual / Anual (−20%) con estado en cliente.
  - Cards uniformes con `border` sutil; el plan "Pro" se distingue con `ring-1` suave + shadow ambiental, no con border grueso.
  - Badge contextual en esquina superior derecha (Pro → "Más elegido", Enterprise → "Para cadenas") sin tapar el header.
  - Sólo se listan features INCLUIDOS (sin tachados, sin candados). Las features premium (POS, Marketing) usan `text-ink` pleno; el resto `text-ink-2` para guiar la vista.
  - Precio gigante con `MXN / mes` en líneas pequeñas.
- **Prevención**: para listas largas de features comparativas, mostrar sólo positivos por columna en lugar de columnas matriciales con tachados — la jerarquía visual se rompe rápido y comunica lo equivocado (lo que NO tiene). Si necesitas comparativa total, usar tabla aparte tipo "all features matrix".

### [2026-05-05] Hydration mismatch en `Preloader` por leer `sessionStorage` en initial state
- **Contexto**: Tras montar `npm run dev` por primera vez en Windows, abrir `/login` mostraba un overlay de Next con error "External changing data without sending a snapshot of it along with the HTML" apuntando al inicio de `LoginPage:40`. La página igual entraba al login y funcionaba.
- **Error**: hydration mismatch — el server enviaba el `Preloader` visible (full-screen `fixed inset-0`) y el cliente, al inicializar el state, devolvía `null` porque `sessionStorage["lumia:preload-shown"]` ya estaba seteado de una visita previa. React detectaba que el primer hijo del body no coincidía y disparaba el warning.
- **Causa raíz**: el `useState(() => { ... sessionStorage.getItem(...) ... })` corría `typeof window !== "undefined"` lazy initializer en server (false → "visible") y en cliente (true → potencialmente "hidden"). El primer render del cliente debe ser idéntico al del server, sin excepciones.
- **Solución**: el state inicial siempre arranca en `"visible"` (matchea el server). La lectura de `sessionStorage` se mueve a un `useEffect`. Si el flag está, hace `setPhase("hidden")` post-hidratación → re-render normal sin error. Returnees ven un flicker brevísimo, aceptable.
- **Prevención**: regla — **nunca** leer `sessionStorage`/`localStorage`/`window.*` dentro de `useState(() => ...)` o durante el body del componente. Si se necesita, hacerlo en `useEffect`. Misma regla aplica a `useReducer` con initializer.

### [2026-05-05] Refundición del sistema de identidad — port de Lumina/Restaurante
- **Contexto**: el editor de identidad anterior (`/admin/identity` y `OnboardingWizard`) tenía 4 presets con sólo 2 colores (`primary` + `accent`), 4 fuentes hardcoded en un `<select>`, y no había vista previa en vivo en el resto de la página. El usuario pidió portar la calidad del sistema de Lumina (Restaurante) — paletas completas, catálogo amplio de fuentes con preview real, paneles separados, live preview en todo el subtree.
- **Error**: N/A (refactor mayor controlado, no fue bug).
- **Causa raíz**: decisión de UX — alinear la herramienta de personalización con la calidad visual del producto.
- **Solución**:
  - **Datos**: `lib/branding-presets.ts` nuevo con 6 presets (Champagne, Esmeralda, Terracota, Medianoche, Rosa té, Bosque), cada uno con paleta light **y** dark de 15 tokens (bg/surface/elevated/ink×3/border/divider/accent×3/states×4). Catálogo de 13 fuentes display + 11 body con sus URLs de Google Fonts.
  - **Adapter**: `lib/branding-adapter.ts` con `flatToRich()` y `richToFlat()` — convierten entre el shape persistido (FLAT, columnas + JSON `extra`) y el modelo del UI (RICH, paleta completa). El campo `extra` evita migración de schema.
  - **Live preview**: `store/branding-preview-store.ts` (Zustand). Mientras el editor está abierto, el draft se publica al store y `BrandingProvider` lo prioriza sobre el persistido. Al guardar/desmontar se limpia.
  - **Provider reescrito**: `BrandingProvider.tsx` aplica 15 vars `--lumia-*` + radio + densidad + fuentes resueltas, todo scoped al wrapper. Inyecta dinámicamente `<link>` de Google Fonts del par tipográfico activo. Mantiene compat con tokens viejos (`--primary`, `--accent`, `--tenant-*`).
  - **Editor reescrito**: `BrandingEditor.tsx` con 4 paneles independientes (Identity / Palette / Typography / Layout) + preview card sticky. Los paneles son reusables — el `OnboardingWizard.tsx` los monta uno por paso (5 pasos: identity → palette → typography → layout → summary).
  - **Backend**: `BrandingController.php` ahora valida y serializa `extra` (array JSON). El modelo ya tenía el campo en `$fillable` con cast `'extra' => 'array'`.
- **Prevención**: cualquier color o tamaño que viva dentro del subtree del tenant **debe** consumirse via `var(--lumia-*)` o token Tailwind — nunca hardcoded. Para añadir presets/fuentes: editar sólo `lib/branding-presets.ts` y documentar en `docs/PRESETS.md`. Detalle arquitectónico completo en `docs/IDENTITY_SYSTEM.md`.

---

## 11. Contexto Importante para Próxima Sesión

> Resumen ejecutivo que se actualiza al cierre de cada tarea para que la siguiente sesión arranque con cero ramp-up.

### Estado actual (al cierre del port de identidad Lumina → LUMIA — 2026-05-05 PM)

> Sesión 2026-05-05 PM: refundición del sistema de identidad portando la
> lógica de Lumina (Restaurante). Suma 3 archivos nuevos + 3 reescritos +
> 1 cambio backend. Ver §10 entrada del 2026-05-05 "Refundición del sistema
> de identidad" para detalle del refactor.

#### Lo nuevo en branding/identidad

- **6 presets** (Champagne, Esmeralda, Terracota, Medianoche, Rosa té,
  Bosque) con paletas light + dark sincronizadas. El default sigue siendo
  Esmeralda (verde botella + oro mate).
- **Paleta de 15 tokens por modo** (no 2): bg/surface/elevated/ink×3/
  border/divider/accent×3/states×4. Editor con color pickers nativos,
  syncs cross-mode para acentos.
- **Catálogo de fuentes**: 13 display + 11 body con preview real (cada
  opción del listado se renderiza en su propia familia, precarga al montar).
- **Live preview**: al editar en `/admin/identity` o en el wizard, todo
  el subtree del `BrandingProvider` (sidebar, header, cards, botones)
  repinta al instante vía store Zustand `useBrandingPreview`.
- **API estable**: el backend conserva el shape FLAT pero ahora acepta
  `extra: array` (JSON) que guarda la paleta rica completa. El adapter
  `flatToRich` / `richToFlat` traduce entre los dos modelos.
- **Wizard rediseñado** (`/admin/onboarding`): 5 pasos con animación
  Framer (identity → palette → typography → layout → summary) y preview
  card lateral pegajoso.

#### Archivos relevantes

```
frontend/src/lib/branding-presets.ts        ← catálogo (presets, fonts, layout)
frontend/src/lib/branding-adapter.ts        ← flat ↔ rich
frontend/src/store/branding-preview-store.ts ← Zustand draft del editor
frontend/src/components/branding/BrandingProvider.tsx   ← reescrito
frontend/src/components/admin/BrandingEditor.tsx        ← reescrito (4 paneles)
frontend/src/components/admin/OnboardingWizard.tsx      ← reescrito (5 pasos)
backend/app/Http/Admin/Controllers/BrandingController.php ← acepta `extra`
docs/IDENTITY_SYSTEM.md                     ← arquitectura completa (NUEVO)
docs/PRESETS.md                             ← actualizado a 6 presets
.claude-skills/branding-tokens.md           ← convenciones (--lumia-*)
```

#### Compatibilidad con presets viejos

Los slugs antiguos (`old-money-emerald`, `ivory-brass`, `navy-classic`,
`carbon-premium`) siguen aceptados por el backend (campo string libre);
si el `flatToRich` no encuentra match, usa el default (`emerald`). Tabla
de migración sugerida en `docs/PRESETS.md`. Para tenants productivos,
migrar a slugs nuevos cuando el admin abra `/admin/identity` y guarde.

#### Operacional Windows (esta sesión)

- PHP 8.4.20 instalado vía `winget install PHP.PHP.8.4` y configurado
  con `extension_dir` apuntando al `ext/` del package. Forward slashes
  con drive letter funcionan en `php.ini` (`C:/Users/.../ext`). Las
  extensiones que sí cargan son: bcmath, curl, fileinfo, gd, intl,
  mbstring, openssl, pdo_sqlite, sodium, sqlite3, zip. `pgsql` y
  `pdo_pgsql` quedan comentadas (no hay binarios libpq compatibles).
- Composer 2.9.7 instalado vía script oficial dentro del directorio de
  PHP (`composer` es un phar; invocar como `php "$PHP_DIR/composer"`).
- Backend SQLite: `migrate:fresh --seed` corre limpio. Login verificado
  end-to-end con cookie httpOnly.
- Dev server frontend en :3000 (`nohup npm run dev > /tmp/lumia-frontend.log 2>&1 & disown`).
- Dev server backend en :8000 (`nohup php artisan serve --host=127.0.0.1 --port=8000 > /tmp/lumia-backend.log 2>&1 & disown`).

---

### Estado anterior (al cierre de auditoría production-readiness — 2026-05-05 AM)

> Tarea 3 (refundición visual + branding + roles + CRUD) cerrada el 2026-04-28.
> Tarea 3.1 (round de fixes post-feedback) cerrada el 2026-04-29.
> Sesión 2026-05-05: auditoría de production readiness. Sin cambios de
> código — sólo documentación (`docs/PRODUCTION_READINESS.md`) más entrada
> en §10. La sesión existe para que cualquier máquina pueda retomar Tarea 4
> con cero ramp-up.
>
> **Para retomar en otra computadora**: leer
> `docs/PRODUCTION_READINESS.md` completo (incluye comandos de bootstrap)
> y luego este §11. Tarea 4 está framed con 6 bloqueantes priorizados.

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

#### Siguiente paso lógico (Tarea 4 — Production prep)

> Toda la planificación detallada (archivos a tocar, criterios de
> aceptación, matriz de riesgos) vive en `docs/PRODUCTION_READINESS.md`.
> Este resumen es sólo el orden recomendado.

**Bloqueantes (sin esto no se sube)** — orden sugerido:

1. **B1 — Postgres + RLS activado**: cambiar `DB_CONNECTION=pgsql`, aplicar `2026_04_27_000001_enable_rls_for_tenant_tables.php`, reescribir seeders SQLite-specific, test obligatorio de aislamiento entre tenants.
2. **Quick wins**: GitHub Actions CI (lint + tests + build), `.env.example` documentado, README operativo.
3. **B6 — Secrets management**: gestor (Doppler/AWS SM/Vault) antes de generar Stripe live keys.
4. **B2 — Stripe Checkout + provisión automática**: webhook crea tenant + admin + magic link por email. Reemplaza el "nuestro equipo te contacta" actual.
5. **B3 — WhatsApp Cloud API real**: 4 plantillas aprobadas por Meta (confirmation, reminder 24h, reminder 2h con botones, cancellation). **Trámite de Meta tarda 2-7 días — arrancar en paralelo a B2.**
6. **B4 — Cifrado PII**: cast `encrypted` en `clients.phone/email/notes` + columna `phone_hash` indexable. Hacerlo antes de tener datos reales.
7. **B5 — Hardening**: HMAC en webhooks, throttle login/booking, cookies `Secure+HttpOnly`, CSP headers, rotación tokens Sanctum.

**Importantes (no bloquean técnicamente, pero no se debería cobrar sin esto)**:

- I1 Tests Pest (smoke CRUD + matriz de roles + anti no-show).
- I2 CRUD UI faltante (ProductsClient, citas manuales, cupones, BusinessHours).
- I3 Permisos finos en UI (esconder acciones según `can_write`/`can_see_finance`).
- I4 Infra prod (K8s o Fly/Railway, Horizon, backups PITR Postgres, TLS, CDN).
- I5 Observabilidad (Prometheus/Grafana + dashboards + alertas + tracing).
- I6 Legal (TOS, Privacidad, cookies, DPAs Meta/Stripe/Twilio, GDPR endpoints).

#### Pendientes manuales (necesitan acción del usuario)

- Configurar credenciales reales de WhatsApp Cloud API, Stripe, MercadoPago y Twilio (todos en `LogDriver`/`MockGateway` por defecto en local).
- Levantar `docker compose up -d` si quieres usar PostgreSQL/Redis en lugar de SQLite/cache file.
- Subir un logo SVG/PNG real para el tenant demo `el-navajazo` (actualmente sólo aparece el wordmark LUMIA).
- Si reinicias y `:3000` está ocupado por otro proyecto: `kill -9 $(lsof -ti:3000)` y relanza Barberia.

#### Riesgos a vigilar

- Cualquier color hardcoded fuera de `globals.css` rompe el sistema de presets — pasarlo a token o `var(--lumia-*)`/`var(--tenant-*)`.
- `BrandingProvider` debe envolver SIEMPRE el subtree de `/admin/*` y `/b/{slug}`. Nunca se aplica a la landing pública (debería conservar identidad LUMIA fija).
- **Nunca** leer `sessionStorage`/`localStorage`/`window.*` dentro de `useState(() => ...)` — provoca hydration mismatch (ver §10 entrada 2026-05-05 sobre `Preloader`). Hacerlo en `useEffect` post-hidratación.
- Al añadir un nuevo token a la paleta rica (`BrandingPalette`), recordar actualizar: tipo + DEFAULT_PALETTE_LIGHT + DEFAULT_PALETTE_DARK + cada preset (light/dark) si se quiere customizar + `paletteToCssVars()`. Sin esto, el preview funciona pero el persistido se rompe (el adapter no encuentra el token).
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

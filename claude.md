# Proyecto: BarberPro SaaS — Plataforma Integral de Gestión para Barberías

> Documento maestro de contexto para Claude Code. Este archivo se carga automáticamente en cada sesión y define la visión, el stack, las reglas de negocio, el sistema visual y el log operativo del proyecto.

---

## 1. Visión General

**BarberPro** es una plataforma SaaS multi-tenant que digitaliza la operación integral de barberías premium: agenda inteligente, gestión de personal, punto de venta, inventario, marketing de retención y finanzas. El producto opera bajo un modelo **Freemium / Suscripción escalonada**, donde **todas** las funcionalidades son visibles en la interfaz, pero las premium aparecen bloqueadas con un icono de candado para usuarios sin la suscripción correspondiente (estrategia de "deseo visible" para maximizar la conversión).

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

### 6.1 Paleta de Colores — Dark Premium

Inspirada en barberías de lujo: cuero, latón, navaja pulida, luz baja.

```css
:root {
  /* Base — Carbón profundo */
  --bg-void:       #07080A;  /* Fondo absoluto */
  --bg-base:       #0E1014;  /* Cards primarias */
  --bg-elevated:   #161A21;  /* Cards elevadas / modales */
  --bg-overlay:    #1F242D;  /* Hover, divisores suaves */

  /* Acento principal — Latón / Oro envejecido */
  --accent-primary:   #C9A961;  /* CTA, números clave */
  --accent-primary-2: #E0BE74;  /* Hover */
  --accent-primary-3: #8E7338;  /* Active / sombras */

  /* Acento secundario — Bordeaux profundo (sangre de barbero) */
  --accent-secondary: #6B1F2A;
  --accent-secondary-2: #8C2A38;

  /* Texto */
  --text-primary:   #F4EFE3;  /* Marfil cálido */
  --text-secondary: #A8A39A;  /* Gris perla */
  --text-muted:     #5C5A55;  /* Disabled / placeholders */
  --text-on-accent: #0E1014;  /* Texto sobre dorado */

  /* Estados semánticos */
  --success: #4F8A6B;
  --warning: #D4954A;
  --danger:  #B8453E;
  --info:    #5B7A99;

  /* Bordes y líneas */
  --border-subtle: rgba(244, 239, 227, 0.06);
  --border-medium: rgba(244, 239, 227, 0.12);
  --border-strong: rgba(201, 169, 97, 0.40);

  /* Glow / Lock overlay */
  --lock-overlay: rgba(7, 8, 10, 0.78);
  --lock-glow:    rgba(201, 169, 97, 0.18);
}
```

### 6.2 Tipografía

- **Display / Hero**: `"Fraunces"` (serif moderna con cortes premium) — pesos 400 / 600 / 800.
- **UI / Body**: `"Inter"` (sans variable) — pesos 400 / 500 / 600.
- **Numérico tabular**: `"JetBrains Mono"` para finanzas y agenda.

### 6.3 Principios de Movimiento

- **Easing por defecto**: `cubic-bezier(0.22, 1, 0.36, 1)` (out-quint) — sensación premium.
- **Duración**: micro (120ms), corta (240ms), media (420ms), narrativa (680ms+).
- **Stagger**: 40-60ms entre elementos hermanos.
- **Todo lo no-CSS pasa por `requestAnimationFrame`** — prohibido `setInterval`/`setTimeout` para animación.

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

---

## 11. Contexto Importante para Próxima Sesión

> Resumen ejecutivo que se actualiza al cierre de cada tarea para que la siguiente sesión arranque con cero ramp-up.

### Estado actual (al cierre de Tarea 2 — 2026-04-26)

- **Completado**:
  - **Backend Laravel 11 + Sanctum** con DDD/Screaming Architecture: 14 bounded contexts (`Tenancy`, `Identity`, `Subscriptions`, `Billing`, `Staff`, `Catalog`, `Scheduling`, `Appointments`, `Payments`, `PointOfSale`, `Inventory`, `Notifications`, `Marketing`, `Finance`).
  - **8 migraciones** creadas y verificadas (en SQLite por defecto, portables a PostgreSQL).
  - **Modelos Eloquent** con `BelongsToTenant` trait + `TenantScope` global.
  - **Repositorios + Servicios**: `BookAppointment`, `ConfirmAppointment`, `CancelAppointment`, `SendWhatsapp`, `RetentionScan`, `AvailabilityCalculator`.
  - **Circuit Breaker Redis** con scripts Lua atómicos para acquire/success/failure (config en `config/circuit-breaker.php`).
  - **Middlewares**: `ResolveTenant`, `EnsureFeatureEnabled` (402 con upgrade payload), `RateLimitByIp` (100 req/min Redis).
  - **API REST** completa: `/api/billing/plans`, `/api/client/*` (público), `/api/admin/*` (con feature gates).
  - **Seeders demo**: tenant "Barbería El Navajazo" con plan Pro, 3 barberos con horarios, 8 servicios, 12 productos, 50 clientes (16 inactivos +30d), 30 citas variadas.
  - **Frontend Next.js 16 + React 19 + Tailwind 4**: paleta dark premium (carbón + latón + bordeaux), Fraunces+Inter+JetBrains Mono, Preloader con logo breathing, fondo Three.js reactivo al ratón con líneas tipo constelación, smooth scroll Lenis, scrollytelling horizontal con GSAP+ScrollTrigger (anti no-show storytelling), transiciones Framer Motion, FeatureGate con candado/blur/CTA upgrade.
  - **Portal Cliente**: landing marketing, vista pública `/b/[slug]`, BookingFlow de 5 pasos (servicio → barbero → fecha → hora → datos → confirmación) con disponibilidad real desde el API.
  - **Portal Admin** completo: Dashboard (KPIs reales), Agenda (citas reales agrupadas por día), Staff (con horarios semanales), Servicios, POS+Inventario, Marketing (selector de clientes inactivos + composer WhatsApp), Finanzas (con FeatureGate Enterprise activo), Billing (cambio de plan).
  - **Docker Compose**: PostgreSQL 16 + Redis 7 + Mailpit + Redis Commander listos para `make up`.
  - **Makefile** + `README.md` actualizados.
- **Stack en ejecución verificado**: Laravel API en `:8000` y Next.js dev server (Turbopack) en `:3000`. Las 10 rutas frontend devuelven 200. Endpoints API responden con datos reales.
- **Siguiente paso lógico (Tarea 3)**: Sustituir SQLite por PostgreSQL con Row Level Security real (políticas RLS por tabla tenant-scoped). Implementar Sanctum login real para `/admin/*` (actualmente identifica tenant por header `X-Tenant`). Añadir tests Pest para los servicios de dominio.
- **Pendientes manuales** (no podía resolverlos sin acción del usuario):
  - Ejecutar `git init && git add -A && git commit ...` (comandos abajo en §13).
  - Levantar `docker compose up -d` si quieres usar PostgreSQL/Redis en lugar de SQLite/cache file.
  - Configurar credenciales reales de WhatsApp Cloud API, Stripe, MercadoPago y Twilio (todos están en `LogDriver`/`MockGateway` por defecto en local).
- **Riesgos a vigilar**:
  - Migraciones nuevas con tablas tenant-scoped deben recordar `tenant_id` indexado y, en PostgreSQL, política RLS.
  - El driver de WhatsApp por defecto es `LogWhatsappClient` → todos los envíos quedan en `storage/logs/laravel.log` con prefijo `[WhatsApp/MOCK]`.
  - El Circuit Breaker degrada a "siempre abierto" si Redis no responde (log warning) — verificar Redis al pasar a producción.
  - `Model::preventLazyLoading(true)` está activo fuera de producción → cualquier lazy load lanza excepción en dev/test.

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

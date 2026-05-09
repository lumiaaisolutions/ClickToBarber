# LUMIA — Sistema de Barbería SaaS

Plataforma multi-tenant para barberías premium. Agenda inteligente, anti
no-show con WhatsApp, marketing de retención, POS, finanzas. Dos portales
(admin + cliente público), white-label nativo por tenant.

> Documentación maestra: [`CLAUDE.md`](./CLAUDE.md) — visión, stack, reglas de
> negocio, log de incidentes.
> Hoja de ruta a producción: [`docs/PRODUCTION_READINESS.md`](./docs/PRODUCTION_READINESS.md).

## Stack

- **Backend**: Laravel 11 (PHP 8.3+), Sanctum, Pest. PostgreSQL 16 con Row
  Level Security en producción (SQLite en dev). Redis para circuit breaker,
  queues, cache.
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind 4, Zustand,
  TanStack Query, Framer Motion, Three.js.
- **Integraciones**: Stripe + MercadoPago (pagos), WhatsApp Cloud API
  (notificaciones), Twilio Voice (fallback no-show). Todas con drivers
  mock/log para dev.

## Quick start (dev local)

Prerrequisitos: PHP 8.3+ con extensions bcmath/intl/sqlite3/openssl/zip,
Composer 2.x, Node 20+, npm. Opcional: Docker para Postgres + Redis.

```bash
# 1) Backend
cd backend
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed     # SQLite (default), incluye demo data

# levantar (Linux/macOS)
nohup php artisan serve --host=127.0.0.1 --port=8000 > /tmp/lumia-backend.log 2>&1 & disown
# levantar (Windows PowerShell)
Start-Process -FilePath "php" -ArgumentList "artisan","serve","--port=8000" -WindowStyle Hidden

# 2) Frontend (otra terminal)
cd ../frontend
cp .env.local.example .env.local
npm install
npm run dev    # arranca en http://localhost:3000
```

Verificar:

```bash
curl http://localhost:8000/up                                 # health
curl http://localhost:8000/api/tenant/el-navajazo/branding    # tenant público
```

## Demo accounts

Todos con password `password`:

| Email | Rol | Notas |
|-------|-----|-------|
| `admin@elnavajazo.test` | admin | onboarding hecho, plan Pro |
| `gerencia@elnavajazo.test` | manager | sin permisos delete |
| `recepcion@elnavajazo.test` | receptionist | lectura y citas |
| `diego@elnavajazo.test` | barber | sólo "mis horarios" |
| `admin@marfil.test` | admin | **sin onboarding** — dispara wizard |

## Comandos útiles

### Backend

```bash
php artisan migrate:fresh --seed       # reset DB + datos demo
php artisan test                       # alias para Pest
./vendor/bin/pest --parallel           # Pest en paralelo
./vendor/bin/pest --filter=Tenant      # un test específico
./vendor/bin/pint                      # auto-fix de estilo
./vendor/bin/pint --test               # check sin escribir (CI)
php artisan tinker                     # REPL
php artisan queue:work                 # workers (jobs de no-show)
```

### Frontend

```bash
npm run dev                            # dev server con turbopack
npm run build                          # build de producción
npm run lint                           # ESLint
npx tsc --noEmit                       # type-check
```

### Docker (opcional, para Postgres + Redis + Mailpit)

```bash
docker compose up -d                   # levanta todo
docker compose logs -f postgres
docker compose down                    # parar
```

## Arquitectura por capas

```
backend/app/
├── Domain/                 ← Bounded contexts (DDD)
│   ├── Appointments/       (BookAppointment, ConfirmAppointment, ...)
│   ├── Tenancy/            (Tenant, BelongsToTenant trait, RLS)
│   ├── Identity/           (User con roles, cifrado PII)
│   ├── Subscriptions/      (Plan, FeatureGate)
│   ├── Notifications/      (WhatsappClient, SendWhatsapp)
│   ├── Payments/           (PaymentGateway, Stripe/MercadoPago)
│   └── ...
├── Infrastructure/         ← Adapters
│   ├── CircuitBreaker/     (Redis con Lua scripts)
│   ├── Integrations/       (Stripe, Meta, Twilio drivers)
│   └── Persistence/
└── Http/
    ├── Admin/Controllers/  ← /api/admin/*
    ├── Client/Controllers/ ← /api/client/*
    └── Common/Middleware/  (ResolveTenant, EnsureRole, RateLimit, ...)

frontend/src/
├── app/
│   ├── (admin)/admin/      ← portal autenticado
│   ├── (client)/b/[slug]/  ← portal público de cada tenant
│   ├── (marketing)/        ← landing
│   └── api/                ← route handlers (proxy a Laravel)
├── components/
│   ├── admin/  ↔ branding/ ↔ client/ ↔ landing/ ↔ ui/
└── lib/
```

## Seguridad

- Multi-tenant con `tenant_id UUID` en todas las tablas + Row Level Security
  en PostgreSQL (`SET LOCAL app.current_tenant`).
- Sanctum Bearer tokens reenviados desde cookie httpOnly por route handlers
  de Next.js (la SPA nunca ve el token).
- Cifrado PII: `users.phone` y `users.notes` usan cast `encrypted` de
  Laravel (Crypt con `APP_KEY`); `users.phone_hash` mantiene un sha256
  indexable para lookups.
- HMAC en webhooks (Stripe, Meta, Twilio) — middleware
  `webhook:{provider}`.
- Throttle por endpoint sensible: `throttle:login`, `throttle:booking`.
- Cabeceras: HSTS, X-Frame-Options DENY, X-Content-Type-Options, CSP
  estricta para JSON.
- Detalle de rotación: [`docs/SECRETS_RUNBOOK.md`](./docs/SECRETS_RUNBOOK.md).

## Tests

Pest (PHP) en `backend/tests/`. Cobertura mínima objetivo: ≥60% en
`app/Domain/*`, 100% en `app/Http/Common/Middleware/*`.

```bash
cd backend
./vendor/bin/pest                                # todos
./vendor/bin/pest --filter=BookAppointment       # un grupo
./vendor/bin/pest --filter=TenantIsolationTest   # requiere Postgres
```

CI corre tres jobs en paralelo: backend (Pest + Pint), frontend (build +
type-check), secrets scan (gitleaks). Ver `.github/workflows/ci.yml`.

## Deploy

Tres bloqueantes antes de subir a producción:

1. **B1**: cambiar a Postgres y aplicar la migración RLS.
2. **B2**: configurar Stripe live + webhook secret y validar el flujo
   completo de provisión.
3. **B3**: aprobar las 4 plantillas WhatsApp con Meta y cambiar
   `WHATSAPP_DRIVER=meta`.

Ver [`docs/PRODUCTION_READINESS.md`](./docs/PRODUCTION_READINESS.md) para
la lista completa.

## Soporte

Repo principal: este. Docs internos: `docs/`. Contacto: nando.torres0987@gmail.com.

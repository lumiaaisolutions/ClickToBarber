# BarberPro — SaaS Multi-Tenant para Barberías

Plataforma integral con dos portales (Admin y Cliente), modelo Freemium con candados visuales en features premium, agenda inteligente, anti no-show con WhatsApp + Twilio, marketing de retención y POS.

> Documentación maestra: [`claude.md`](./claude.md). Reglas de arquitectura: [`.claude-skills/`](./.claude-skills/).

## Stack
- **Backend**: Laravel 11 (DDD + Screaming Architecture), PHP 8.4
- **Frontend**: Next.js 15 (App Router, RSC), React 19, Tailwind 4
- **DB**: PostgreSQL 16 (Row Level Security para multi-tenancy)
- **Cache/Queue**: Redis 7 (Circuit Breaker, rate limit, sesiones)
- **Auth**: Laravel Sanctum + JWT
- **Animación**: Three.js, GSAP+ScrollTrigger, Framer Motion, Lenis

## Quickstart

```bash
# 1. Levanta PostgreSQL + Redis + Mailpit
make up

# 2. Instala dependencias
make install

# 3. Migra y siembra datos demo (incluye barbería "El Navajazo")
make fresh

# 4. En una terminal: backend
make back
# → http://localhost:8000

# 5. En otra terminal: frontend
make front
# → http://localhost:3000
```

## Acceso de prueba (demo seed)

| Rol | Email | Password | URL |
|-----|-------|----------|-----|
| Admin barbería | admin@elnavajazo.test | password | http://localhost:3000/admin |
| Cliente público | — | — | http://localhost:3000/b/el-navajazo |

## Estructura

```
backend/                  Laravel API (DDD)
  app/Domain/{ctx}/       Bounded contexts (Appointments, Staff, ...)
  app/Infrastructure/     Adaptadores (CircuitBreaker, integraciones)
  app/Http/{Admin,Client} Controllers single-action
frontend/                 Next.js
  src/app/(admin)         Portal Admin
  src/app/(client)        Portal Cliente
  src/app/(marketing)     Landing + planes
  src/domains/{ctx}       Lógica por dominio (espejo del backend)
  src/components/         UI shared (FeatureGate, Preloader, ...)
infra/postgres/init.sql   Extensiones uuid-ossp, pgcrypto, citext
docker-compose.yml        PostgreSQL + Redis + Mailpit + Redis Commander
```

## Servicios auxiliares

| Servicio | URL |
|----------|-----|
| Mailpit (capta emails dev) | http://localhost:8025 |
| Redis Commander | http://localhost:8081 |
| PostgreSQL | localhost:5433 (user/db: barberpro, pass: barberpro_dev) |

## Tests

```bash
cd backend && php artisan test
cd frontend && npm run lint
```

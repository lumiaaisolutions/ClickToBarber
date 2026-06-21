# Setup de producción — ClickToBarber

> Estado del sistema: **EN PRODUCCIÓN desde 2026-06-20**.

Última actualización: **2026-06-20** (sesión 4 — primer deploy exitoso).

---

## TL;DR

- ✅ **Sistema LIVE.** API y frontend en producción desde 2026-06-20.
- ✅ **Las 4 acciones humanas** (DNS, MySQL, Stripe, Mail) completadas.
- ✅ **Demo data** sembrada en prod: `el-navajazo`, `marfil-avenue`.
- ⚠️ **4 pendientes** — 2 urgentes (crons + renovación VPS), 2 de seguridad/validación.

URLs de producción:
- Frontend: **https://clicktobarber.lumiaaisolutions.com** ✅
- API: **https://clicktobarber-api.lumiaaisolutions.com** ✅

---

## ✅ Lo que YA está hecho

### Estructura y rebrand
- Repo movido `/tmp/Sistema_Barberia` → `~/Desktop/LUMIA/clicktobarber/`, origin desconectado.
- Layout estándar `apps/api` + `apps/web` + `scripts` + `docs`.
- Rebrand global: `composer.json`, `package.json`, `README.md`, `CLAUDE.md`, `apps/api/.env.example`, `apps/web/src/app/layout.tsx` metadata.
- `composer.json` tiene `config.platform.php = 8.3.30` (alineado al PHP 8.3 del servidor de producción).

### Features cortadas
- Rutas removidas en `routes/api.php`: 2FA TOTP, audit log endpoint, CFDI, custom domains, PWA push.
- Middleware `force2fa` y `ResolveTenantByHost` removidos.
- `bootstrap/app.php` limpio.
- `AuthController` reescrito sin lógica 2FA.
- Frontend: `manifest.ts`, `PwaRegister.tsx` eliminados, referencias removidas.
- Archivos huérfanos borrados (con `git rm`, revertibles).
- Migración RLS Postgres-only eliminada.

### MySQL (en lugar de PostgreSQL)
- `apps/api/.env.example` default DB → `mysql` con vars Hostinger pre-llenadas.
- `config/database.php` ya viene con bloque mysql funcional (Laravel default).
- `ResolveTenant.php` ya tenía guard `if pgsql` para `SET LOCAL` (no afecta a MySQL).
- Sin cambios necesarios en migraciones (todas usan `->json()` no `->jsonb()`, UUIDs portables).

### Hostinger CageFS compatibility
- `NullCircuitBreaker` reemplaza Redis por default (opt-in via `CB_DRIVER=redis`).
- Cache/Queue/Session drivers default a `database` (verificado).
- Horizon no instalado.
- `.htaccess` raíz + `apps/api/public/.htaccess` con security headers.

### WhatsApp híbrido
- `WaLinkWhatsappClient` creado: genera links `wa.me/<num>?text=<mensaje>` con templates en español.
- `DomainServiceProvider` con binding híbrido (wa_link por default, fallback automático si Cloud API sin creds).

### Suscripciones / Billing (portado de ClickToEat)
- `Tenant::hasActivePlan()` con lógica pago_externo + trial + grace period.
- `BillingActivateExistingController` — checkout vinculado a tenant existente.
- `ExpireManualTrialsCommand` + schedule diaria 10:30.

### Visual redesign
- Paleta ClickToBarber: navy `#1E3A8A` + cyan `#06B6D4` + warm-white `#FAFAF7`.
- Logo SVG propio: silla de barbero + tijera + gradient azul→cyan.
- Dark mode preflight sin flash blanco.

### Deploy
- `scripts/deploy-api.sh` + `scripts/deploy-web.sh` con paths/dominios ClickToBarber.

### SEO y E2E
- `robots.ts`, `sitemap.ts`, `generateMetadata()` dinámico por tenant con OG image.
- `admin-login.spec.ts` (3 tests) + `public-booking.spec.ts` (5 tests).

### Sesión 4 — deploy a producción (2026-06-20)
- **DNS** ✅ — Subdominios configurados vía Hostinger API, SSL emitido.
- **MySQL** ✅ — BD `u221820910_clicktobarber` + migraciones 20/20 aplicadas.
- **Stripe** ✅ — 3 productos, 6 precios, webhook registrado en live mode.
- **Mail** ✅ — Alias `noreply@lumiaaisolutions.com`, SMTP `fernando@lumiaaisolutions.com`.
- **Deploy API** ✅ — rsync + composer + migrate + cache + seed.
- **Deploy Web** ✅ — Next.js standalone + Passenger `.htaccess` manual.
- **Demo data** ✅ — `el-navajazo` y `marfil-avenue` activos en prod.

---

## ⚠️ Pendientes

### 1. Cron jobs en hPanel — URGENTE (scheduled tasks no corren sin esto)

hPanel → Websites → clicktobarber-api.lumiaaisolutions.com → Cron Jobs → Crear:

| Schedule | Command |
|---|---|
| `* * * * *` | `cd /home/u221820910/domains/clicktobarber-api.lumiaaisolutions.com/public_html && php artisan schedule:run >> storage/logs/cron.log 2>&1` |
| `* * * * *` | `cd /home/u221820910/domains/clicktobarber-api.lumiaaisolutions.com/public_html && php artisan queue:work --stop-when-empty --max-time=55 >> storage/logs/queue.log 2>&1` |

Sin estos: trials no expiran, emails en cola no se envían, dunning no funciona.

### 2. Renovar VPS — URGENTE (vence 2026-06-23)

El VPS vence en 3 días. hPanel → VPS → Facturación → Renovar antes del 2026-06-23.

### 3. Eliminar restricted key de Stripe (seguridad)

Stripe Dashboard → Developers → API Keys → borrar la restricted key `rk_live_...` usada durante la configuración inicial. Ya no es necesaria.

### 4. Probar webhook de Stripe manualmente

Stripe Dashboard → Developers → Webhooks → tu endpoint → **Send test webhook** → `checkout.session.completed`.
Debe responder 200 OK. Confirma que `STRIPE_WEBHOOK_SECRET` en `.env` es correcto.

---

## Referencia — URLs y configuración

| Recurso | Valor |
|---|---|
| Frontend | https://clicktobarber.lumiaaisolutions.com |
| API | https://clicktobarber-api.lumiaaisolutions.com |
| Healthcheck | https://clicktobarber-api.lumiaaisolutions.com/up |
| BD (prod) | `u221820910_clicktobarber` en `localhost:3306` |
| Mail SMTP | `smtp.hostinger.com:465 SSL` |
| Mail FROM | `noreply@lumiaaisolutions.com` |
| Mail AUTH | `fernando@lumiaaisolutions.com` |
| Stripe webhook URL | `/api/webhooks/stripe` |
| SSH | `ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72` |
| API root servidor | `~/domains/clicktobarber-api.lumiaaisolutions.com/public_html/` |
| Frontend root servidor | `~/domains/clicktobarber.lumiaaisolutions.com/nodejs/` |

Demo tenants:
- `el-navajazo` → https://clicktobarber.lumiaaisolutions.com/b/el-navajazo
- `marfil-avenue` → https://clicktobarber.lumiaaisolutions.com/b/marfil-avenue

---

## Pendientes opcionales post-MVP

1. **JSON-LD `LocalBusiness`** por tenant — rich snippets en Google. Ver [`features/seo.md`](features/seo.md#cobertura-pendiente-post-mvp).
2. **Brand strings residuales** — `LUMIA` en mensajes UI y comandos `lumia:*`. Sweep manual cuando sea oportuno.
3. **WhatsApp Cloud API** — opcional (default es `wa_link`). Configurar en `.env` cuando tengas aprobación Meta.
4. **Sentry** — `SENTRY_LARAVEL_DSN` en `.env` API y `NEXT_PUBLIC_SENTRY_DSN` en variables de build frontend.

---

## Verificación post-deploy

```bash
curl -sI https://clicktobarber-api.lumiaaisolutions.com/up | head -1   # → HTTP/2 200
curl -sI https://clicktobarber.lumiaaisolutions.com | head -1           # → HTTP/2 200
curl -sI https://clicktobarber.lumiaaisolutions.com/robots.txt | head -1  # → HTTP/2 200
curl -sI https://clicktobarber.lumiaaisolutions.com/sitemap.xml | head -1 # → HTTP/2 200
curl -s https://clicktobarber.lumiaaisolutions.com/b/el-navajazo | grep -oE 'og:title"[^>]+content="[^"]*"'
# → Barbería El Navajazo — Reserva tu cita
```

---

## Rollback de emergencia

```bash
# Frontend
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72 \
  'cd /home/u221820910/domains/clicktobarber.lumiaaisolutions.com/nodejs && \
   rm -rf .next public && mv .next.previous .next && mv public.previous public && \
   touch tmp/restart.txt'

# Backend
git checkout HEAD~1
./scripts/deploy-api.sh --skip-tests --skip-migrate
```

---

## Redeploy (cambios futuros)

```bash
./scripts/deploy-api.sh          # API: rsync + composer + migrate + cache + health check
./scripts/deploy-web.sh          # Web: build + tar + scp + Passenger restart + health check
```

Ver gotchas completos en [`runbook/deploy-clicktobarber.md`](runbook/deploy-clicktobarber.md).

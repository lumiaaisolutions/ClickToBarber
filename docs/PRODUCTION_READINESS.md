# LUMIA — Production Readiness Roadmap

> Última auditoría: **2026-05-05**, sobre el estado al cierre de Tarea 3.1.
> Este documento es la fuente de verdad para "qué falta antes de producción".
> Se actualiza cada vez que se complete o se descubra un bloqueante nuevo.

## TL;DR

**No estamos listos para producción.** El producto funciona end-to-end en
local con SQLite + drivers mock, pero faltan piezas estructurales (cobro
real, RLS activo, integraciones reales, hardening) que no son polish sino
bloqueantes de seguridad y de modelo de negocio.

Estimación gruesa: **3-5 semanas** de trabajo focalizado para llegar a un
MVP cobrable, asumiendo 1-2 desarrolladores a tiempo completo.

---

## Estado actual (snapshot 2026-05-05)

### ✅ Listo y verificado

- Refundición visual LUMIA Old Money + sistema de presets (4 paletas).
- White-label dinámico por tenant vía `<BrandingProvider>` scoped.
- Roles ampliados (`platform_owner` / `admin` / `manager` / `receptionist` / `barber` / `client`) con middleware `EnsureRole`.
- CRUD con permisos: Staff, Services, Products (endpoints; UI parcial).
- Onboarding wizard 4-pasos cuando `users.first_login_at = null`.
- Editor permanente de branding en `/admin/identity`.
- Flujo público de reserva en `/b/{slug}` (BookingFlow 5 pasos).
- Anti no-show: confirmación T-2h con botones, cancelación T-1h con lock distribuido Redis.
- Circuit Breaker Redis (scripts Lua atómicos) sobre canales sensibles (WhatsApp, Twilio).
- Feature gates Freemium: backend `EnsureFeatureEnabled` (402) + frontend `<FeatureGate>` con blur+candado.
- Migraciones PostgreSQL con RLS escritas (no aplicadas — corre SQLite).
- Sanctum Bearer auth (sin `statefulApi()` — fix Tarea 3.1).
- Demo accounts funcionando (5 roles distintos, 1 con onboarding pendiente).

### ⚠️ Funcional pero mock / incompleto

- **Pagos**: Stripe + MercadoPago en `MockGateway`. La página `/precios` dice "nuestro equipo te contacta".
- **WhatsApp**: `LogWhatsappClient` escribe a `storage/logs/laravel.log`. No hay plantillas aprobadas por Meta.
- **Twilio Voice**: stub. Fallback de no-show no llama realmente.
- **Base de datos**: SQLite en dev. `migrate:fresh --seed` corre limpio. Postgres+RLS sólo en migraciones.
- **CRUD UI**: Productos, Citas (admin manual), Cupones, BusinessHours — endpoints existen, UI no.
- **Tests**: `Pest` instalado, ~0 tests reales. Riesgo alto de regresión en permisos.

### ❌ No existe aún

- CI/CD pipeline (`.github/workflows/` vacío).
- Manifests Kubernetes / IaC para producción.
- Stack de observabilidad cableado (Prometheus/Loki/OpenTelemetry).
- Backups automáticos.
- Términos, Privacidad, política de cookies.
- DPAs firmados con Meta/Stripe/Twilio.

---

## Bloqueantes de producción

> Sin resolver TODOS estos, no se sube. Cada uno tiene archivos a tocar
> y criterio de aceptación medible.

### B1 — Migrar a PostgreSQL real con RLS activado

**Por qué bloquea**: shared-database multi-tenant sin RLS = un bug en un
`where('tenant_id')` filtra datos entre clientes. Defensa en profundidad
es no-negociable cuando hay teléfonos/emails de clientes finales.

**Trabajo**:
- Levantar Postgres 16 (ya hay `docker-compose.yml` con servicio listo).
- Cambiar `DB_CONNECTION=pgsql` en `.env` y ajustar `database.php`.
- Aplicar `2026_04_27_000001_enable_rls_for_tenant_tables.php`.
- Verificar que `App\Infrastructure\Persistence\TenantConnectionResolver` (o el middleware `ResolveTenant`) emita `SET LOCAL app.current_tenant = '...'` por request.
- Reescribir seeders que asuman SQLite (revisar `DemoTenantSeeder` y `OnboardingDemoSeeder` por raw queries SQLite-specific).
- Ajustar columnas `JSONB` (en SQLite eran TEXT).
- Probar cada test Pest contra Postgres en CI.

**Criterio de aceptación**:
- Todos los seeders corren sin errores en Postgres.
- Test que como `tenant A` intenta `Service::find($id_de_tenant_B)` devuelve `null` aun cuando se quita el global scope (RLS lo bloquea a nivel motor).
- Métrica: tiempo de `migrate:fresh --seed` < 10s en CI.

### B2 — Stripe Checkout + provisión automática de tenants

**Por qué bloquea**: hoy no hay forma de que un usuario pague y se cree
su cuenta. La landing miente diciendo "elige tu plan" cuando es un
formulario de contacto.

**Trabajo**:
- Crear `App\Domain\Billing\Services\CreateCheckoutSession`.
- Endpoint `POST /api/public/checkout` que recibe `{plan, email, business_name}` y devuelve URL de Stripe Checkout.
- Webhook `POST /api/webhooks/stripe`:
  - `checkout.session.completed` → `ProvisionTenant` (crea tenant + admin user + subscription + envía email con credenciales temporales).
  - `invoice.payment_failed` → marca subscription `past_due`, notifica admin.
  - `customer.subscription.deleted` → suspende features (downgrade a Free).
- Validar firma HMAC con `stripe-php` (`Stripe\Webhook::constructEvent`).
- Página `/checkout/success?session_id=...` que muestre "Revisa tu email".
- Job `SendOnboardingEmail` con magic link (token 1-uso, expira 24h).

**Criterio de aceptación**:
- Comprar plan Pro en modo test crea: 1 tenant, 1 user `admin` con `first_login_at=null`, 1 subscription activa, 1 email recibido con magic link.
- Webhook con firma inválida responde 400.
- Idempotencia: reenviar el mismo `checkout.session.completed` no crea duplicados (chequear `stripe_event_id` en `webhook_events`).

### B3 — WhatsApp Cloud API + plantillas aprobadas

**Por qué bloquea**: el diferenciador #1 del producto (anti no-show) hoy
escribe a un log. Sin envío real no hay producto.

**Trabajo**:
- Verificar número de WhatsApp Business con Meta (proceso de 2-7 días).
- Crear y someter a aprobación 4 plantillas:
  1. `appointment_confirmation` — al crear cita.
  2. `appointment_reminder_24h` — recordatorio amigable.
  3. `appointment_reminder_2h_with_buttons` — con quick replies Confirmar/Reagendar/Cancelar.
  4. `appointment_cancelled_no_response` — cancelación + retención de depósito.
- Reemplazar `LogWhatsappClient` por `MetaWhatsappClient` (HTTP a `graph.facebook.com/v20.0/{phone_id}/messages`).
- Webhook `POST /api/webhooks/whatsapp` para recibir respuestas a botones (validar `X-Hub-Signature-256`).
- Mapear `button_payload` → `ConfirmAppointment` / `RescheduleAppointment` / `CancelAppointment`.
- Mantener Circuit Breaker (ya existe) — abrir tras 5 fallos en 60s.

**Criterio de aceptación**:
- Crear cita de prueba envía un WhatsApp real al número verificado.
- Responder al botón "Confirmar" cambia el estado a `confirmed` en < 5s.
- Si Meta API responde 429, el breaker se abre y los siguientes envíos van a cola con backoff exponencial.

### B4 — Cifrado PII en reposo

**Por qué bloquea**: §8 lo exige, y es requisito legal en muchos países
LATAM tener teléfonos/emails cifrados en reposo. Migrar después es 10x
más doloroso que hacerlo antes de tener datos reales.

**Trabajo**:
- Añadir cast `encrypted` a `Client::$casts` para `phone`, `email`, `notes`.
- Migración para renombrar columnas a nullable y re-cifrar las existentes (los seeders se borran y regeneran, no hay datos reales aún → fácil ahora, doloroso después).
- Para queries: `Client::where('phone_hash', hash('sha256', $phone))` con columna `phone_hash` indexable separada (porque `encrypted` no se puede indexar útilmente).
- Lo mismo para `users.phone` si se guarda.

**Criterio de aceptación**:
- `psql -c "SELECT phone FROM clients LIMIT 1"` devuelve un blob base64, no un teléfono.
- Búsqueda por teléfono sigue funcionando vía `phone_hash`.

### B5 — Hardening de webhooks, sesiones y rate limiting

**Por qué bloquea**: cualquier endpoint `/api/webhooks/*` sin firma HMAC
es una puerta abierta. Sin rate limiting, login es brute-forceable.

**Trabajo**:
- Validación HMAC en cada webhook: Stripe (`stripe-signature`), Meta (`X-Hub-Signature-256`), Twilio (`X-Twilio-Signature`). Ya documentado en §8 — verificar implementación real.
- Throttle en login: `throttle:5,1` por IP + `throttle:5,15` por email.
- Throttle en `/api/client/appointments` (POST): `throttle:10,60` por IP — evita bots reservando slots.
- Cookies con `Secure` y `HttpOnly` siempre en prod (`config/session.php`).
- Rotación de tokens Sanctum: `sanctum.expiration = 60 * 24 * 7` (7 días) y refresh on activity.
- CSP headers vía middleware (`Content-Security-Policy`, `X-Frame-Options: DENY`, `Strict-Transport-Security`).

**Criterio de aceptación**:
- Webhook con firma falsa → 400.
- 6º intento de login con password incorrecto desde la misma IP en < 1min → 429.
- Headers de seguridad presentes en respuesta de cualquier ruta (curl `-I`).

### B6 — Secrets management y env de producción

**Por qué bloquea**: cualquier secret en repo o en CI logs invalidado
implica rotar todas las integraciones (Stripe live, Meta, Twilio, JWT
keys). Una vez expuesto, el daño es irreversible.

**Trabajo**:
- `backend/.env.production` separado, **no** en repo (ya está gitignored).
- Secrets en gestor: AWS Secrets Manager / Doppler / Vault. NO `.env` en producción.
- `APP_DEBUG=false`, `APP_ENV=production`, `LOG_LEVEL=warning` en prod.
- `php artisan key:generate` con `APP_KEY` rotado (no reusar el de dev).
- Stripe live keys, Meta tokens, Twilio creds — todos nuevos para prod.
- Romper el repo si alguien comitea un secret: pre-commit hook con `gitleaks` o `trufflehog`.

**Criterio de aceptación**:
- `grep -r "sk_live\|sk_test_real" .` no encuentra nada.
- Pre-commit hook bloquea cualquier patrón de API key.
- Documento `docs/SECRETS_RUNBOOK.md` con quién tiene acceso a qué y cómo rotar.

---

## Importantes (no bloquean técnicamente, pero no se debería cobrar sin esto)

### I1 — Tests Pest mínimos

- Smoke por endpoint CRUD: que cada `POST/PUT/DELETE` con datos válidos devuelva 200/201 y persista.
- Matriz de roles: 5 roles × cada endpoint protegido por `role:` → ¿devuelve 200 o 403 según matriz?
- Anti no-show: cita creada en T → confirmada en T-2h → no se cancela. Cita sin respuesta → cancelada en T-1h con depósito retenido.
- Branding: cambiar preset de tenant A no afecta tenant B (regression de scoping).

**Meta**: cobertura > 60% en `app/Domain/*`, 100% en `app/Http/Middleware/*`.

### I2 — CRUD UI faltante

Endpoints existen, falta frontend:
- `frontend/src/app/(admin)/admin/pos/products/ProductsClient.tsx` (espejo de `ServicesClient`).
- Modal "Crear cita manual" en `/admin/agenda` (admin/manager/receptionist).
- `/admin/marketing/coupons` con generador de cupones únicos.
- Editor visual `BusinessHours` en `/admin/settings/hours` (drag para horarios, blackouts).

### I3 — Permisos finos en UI

Backend ya bloquea, pero la UI muestra botones que devuelven 403. Esconder según `can_write` / `can_see_finance` que ya viene de `/auth/me`:
- `/admin/finance/*` → invisible para `barber`, `receptionist`.
- Botón "Eliminar barbero" → invisible para `manager` (sólo admin).
- Botón "Cambiar plan" → sólo `admin`.

### I4 — Infraestructura de producción

- Manifests Kubernetes (o Fly.io / Railway / Render para empezar barato).
- Laravel Horizon con Redis persistente (no `cache file`).
- Backups automáticos PITR de Postgres (RPO ≤ 1h, RTO ≤ 4h).
- TLS via Cloudflare o Let's Encrypt.
- CDN para assets (`/storage/logos/*`).
- Health checks (`/up` ya viene en Laravel 11) + readiness probes.

### I5 — Observabilidad

- Prometheus + Grafana o Datadog.
- Dashboards mínimos:
  - Tasa de no-shows por tenant (semana móvil).
  - Webhooks fallidos (Stripe / Meta / Twilio) por hora.
  - Circuit breakers abiertos en este momento.
  - p50 / p95 / p99 de `/api/client/availability` y `/api/client/appointments`.
  - Errores 4xx / 5xx por endpoint.
- Alertas:
  - Stripe webhook failure rate > 1% en 5min → page on-call.
  - Cualquier 5xx en endpoints públicos → log estructurado + alerta.
- Tracing OpenTelemetry: span por request con `tenant_id`, `user_id`, `request_id`.

### I6 — Legal / Compliance

- Términos de Servicio + Política de Privacidad (LATAM + GDPR si hay clientes UE).
- Política de cookies (banner si se sirve a UE).
- DPA con Meta, Stripe, Twilio (los 3 ofrecen DPA estándar firmable).
- Política de retención: eliminar datos de clientes finales tras X meses sin actividad.
- Endpoint `/api/admin/data-export` (GDPR Art. 15) y `/api/admin/data-deletion` (Art. 17).

---

## Quick wins (1-2 días)

- **CI con GitHub Actions**: lint PHP (Pint) + lint TS (ESLint) + tests Pest + build Next.js. Bloquea merge si falla.
- **Logo real del tenant demo** `el-navajazo` (hoy es sólo el wordmark LUMIA).
- **`php artisan optimize`** + verificar que `next build` cumple §9 (admin bundle < 180KB gzipped).
- **README.md operativo**: cómo levantar local, cómo correr tests, cómo deployar staging.
- **`.env.example`** completo con todas las variables (hay `.env` vacío para dev pero no `.env.example` documentado).

---

## Orden de ejecución sugerido

1. **B1 (Postgres+RLS)** — cuesta más postergar que cualquier otra cosa, porque exige reescribir tests y seeders. Bloquea todo lo demás indirectamente.
2. **Quick wins (CI + .env.example)** — necesarios para que cualquier otro trabajo se valide automáticamente.
3. **B6 (Secrets)** — antes de tocar Stripe/Meta hay que tener dónde guardar las llaves reales.
4. **B2 (Stripe + provisión)** — primera fuente de revenue real. Sin esto el producto es una demo.
5. **B3 (WhatsApp real)** — diferenciador #1, pero requiere 2-7 días de aprobación de Meta. Arrancar el trámite **en paralelo a B2**.
6. **B4 (PII)** — antes de tener datos reales de clientes finales.
7. **B5 (Hardening)** — antes del primer beta tester externo.
8. **I1 (Tests)** — antes del primer cliente que pague.
9. **I4 + I5 (Infra + Observabilidad)** — antes del primer cliente con tráfico real (>10 req/min).
10. **I6 (Legal)** — antes de cualquier marketing público.
11. **I2 + I3 (CRUD UI + permisos finos)** — pueden iterar después del lanzamiento si no son críticos para el primer use case.

---

## Riesgos con seguimiento

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|:------------:|:-------:|------------|
| Aprobación de plantillas WhatsApp tarda > 7 días | Media | Alto | Empezar trámite **ya**, no en paralelo a desarrollo |
| Stripe rechaza la cuenta business (LATAM) | Baja | Crítico | Tener MercadoPago como fallback completo |
| Bug en RLS filtra datos entre tenants | Baja | Crítico | Test obligatorio en CI: `tenant_isolation_test.php` |
| Webhook duplicado (Stripe reintenta) crea tenant x2 | Media | Alto | Tabla `webhook_events` con UNIQUE en `event_id`, idempotencia |
| Circuit breaker mal calibrado bloquea envíos legítimos | Media | Medio | Métricas en Grafana + alerta cuando `state=open` > 5min |
| Bundle frontend supera 180KB en admin | Media | Bajo | Bundle analyzer en CI, dynamic imports para `BrandingEditor`, `OnboardingWizard` |

---

## Cómo retomar esta sesión en otra computadora

```bash
# 1. Clonar y posicionarse
git clone https://github.com/LUMIA-AI-SOLUTIONS/Sistema_Barberia.git
cd Sistema_Barberia

# 2. Backend
cd backend
cp .env.example .env  # rellenar APP_KEY, DB_*, etc.
composer install
php artisan key:generate
php artisan migrate:fresh --seed
nohup php artisan serve --port=8000 > /tmp/lumia-backend.log 2>&1 & disown

# 3. Frontend (otra terminal)
cd ../frontend
cp .env.local.example .env.local  # apuntar NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
nohup npm run dev > /tmp/lumia-frontend.log 2>&1 & disown

# 4. Verificar que :3000 y :8000 están vivos
lsof -ti:3000 :8000

# 5. Login con cualquier demo account (ver claude.md §11)
open http://localhost:3000/login
```

**Antes de empezar Tarea 4**: leer este doc + `claude.md` §10 (log de bugs)
+ §11 (estado actual). Cualquier decisión arquitectónica tomada en otra
máquina debe documentarse aquí mismo antes de mergear.

---

## Cambios desde la última auditoría

- **2026-05-05** — Documento creado. Audit inicial post-Tarea 3.1.

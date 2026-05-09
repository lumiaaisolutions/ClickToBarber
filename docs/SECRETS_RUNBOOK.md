# LUMIA — Runbook de Secrets

> Toda credencial de producción se maneja desde un gestor de secrets, **nunca**
> commiteada al repositorio ni en logs de CI. Este documento describe qué
> secret existe, dónde se rota, quién tiene acceso y cómo se inyecta en cada
> entorno.

## Principios

1. **`.env` nunca se cometea**. Está en `.gitignore`. `.env.example` es la
   única referencia pública y sólo contiene nombres de variables y comentarios.
2. **Nunca dos entornos comparten el mismo secret**. Stripe live ≠ Stripe
   test ≠ staging. APP_KEY se rota por entorno.
3. **Acceso mínimo necesario**. Sólo el equipo de plataforma tiene acceso
   completo al gestor; devs leen lo que necesitan a través de SSO + 2FA.
4. **Rotación periódica**: APP_KEY anual, tokens API si proveedor lo permite,
   inmediato ante sospecha de compromiso.

## Gestor recomendado

Tres opciones aceptables (ordenadas de menor a mayor sobreingeniería):

- **Doppler** — UI simple, integración nativa con Vercel/Fly/Railway, SSO con
  GitHub. Recomendado para equipos < 10.
- **AWS Secrets Manager** — si ya usás AWS para infra. Rotación automática.
- **HashiCorp Vault** — sólo si tenés equipo de plataforma dedicado.

Para todos los nuevos proyectos LUMIA: **Doppler** por defecto.

## Inventario de secrets

### Backend (Laravel)

| Variable | Uso | Dónde se obtiene | Rotación |
|----------|-----|------------------|----------|
| `APP_KEY` | Encryption Laravel (sessions, cifrado PII de teléfonos) | `php artisan key:generate` | Anual o ante sospecha |
| `DB_PASSWORD` | Postgres | gestor de DB del cloud | Trimestral |
| `REDIS_PASSWORD` | Redis (sessions, queues, breakers) | gestor del cluster | Trimestral |
| `STRIPE_SECRET` | API Stripe (charges, checkout sessions) | dashboard.stripe.com → API keys | Inmediata si leak |
| `STRIPE_WEBHOOK_SECRET` | HMAC de `/api/webhooks/stripe` | dashboard.stripe.com → Webhooks endpoint | Si endpoint se recrea |
| `WHATSAPP_TOKEN` | Bearer permanente Meta Business | Meta Business Suite → System User → Access Token | Anual o ante leak |
| `META_WEBHOOK_SECRET` | HMAC de `/api/webhooks/whatsapp` | Configuración del webhook en Meta | Si endpoint se recrea |
| `META_WEBHOOK_VERIFY_TOKEN` | Verificación inicial del webhook (GET) | Generado random, mismo valor en ambos lados | Una vez |
| `TWILIO_TOKEN` | Auth Token Twilio (también HMAC del webhook) | console.twilio.com → Account → Auth Token | Trimestral |
| `MERCADOPAGO_TOKEN` | API MercadoPago | dashboard.mercadopago.com | Trimestral |
| `MAIL_PASSWORD` | SMTP (si aplica) o API key de Resend/Postmark | provider | Trimestral |

### Frontend (Next.js)

| Variable | Uso | Sensibilidad |
|----------|-----|--------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js en browser | **Pública** (no es secret pero versión por entorno) |
| `BARBERPRO_API_URL` | URL backend (server-side) | Pública |
| `NEXT_PUBLIC_SENTRY_DSN` | Telemetría error tracking | Pública (DSN está diseñado para vivir en cliente) |

> El frontend **nunca** lee `STRIPE_SECRET` ni `WHATSAPP_TOKEN`. Esos sólo
> existen en el backend.

## Procedimiento de rotación

### Stripe webhook secret

1. Crear nuevo webhook endpoint en dashboard.stripe.com (no eliminar el viejo aún).
2. Copiar `whsec_...` nuevo a Doppler bajo `STRIPE_WEBHOOK_SECRET_NEXT`.
3. Hacer deploy con ambos valores aceptados (modificar `VerifyWebhookSignature`
   para probar `current` y `next` durante 24h).
4. Apuntar el endpoint de Stripe al backend; eliminar el viejo.
5. Promover `STRIPE_WEBHOOK_SECRET_NEXT` → `STRIPE_WEBHOOK_SECRET`. Borrar `_NEXT`.

### `APP_KEY` (encryption Laravel)

⚠️ **Cuidado**: rotar `APP_KEY` invalida sesiones y rompe el descifrado de
columnas `encrypted` (teléfonos de clientes). Procedimiento seguro:

1. Generar nueva key con `php artisan key:generate --show`.
2. Setear `APP_PREVIOUS_KEYS=<key-actual>` en gestor.
3. Promover la nueva como `APP_KEY`.
4. Correr migración de re-cifrado: `php artisan lumia:rotate-pii-key` (TODO:
   implementar — lee con `APP_PREVIOUS_KEYS`, escribe con `APP_KEY`).
5. Tras 24h sin incidentes, borrar `APP_PREVIOUS_KEYS`.

## Pre-commit hook

Bloquear commits que contengan patterns de API keys reales. Recomendado:
[`gitleaks`](https://github.com/gitleaks/gitleaks). Config en
`.github/gitleaks.toml`. Hook local en `.husky/pre-commit` o equivalente.

```bash
# Instalación
curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/scripts/install.sh | sh

# Hook local
gitleaks detect --staged --no-git -v
```

CI también debería correrlo en cada PR (ya está incluido en
`.github/workflows/ci.yml`).

## Qué hacer si se filtra un secret

1. **Inmediato (< 5 min)**: rotar la credencial en el provider. Para Stripe:
   "Roll" en dashboard. Para Meta: regenerar token. Para AWS: deshabilitar
   IAM key.
2. **Auditoría**: `git log -p -- <archivo>` para confirmar el commit que lo
   filtró. Si llegó a un push remoto, asumir comprometido y rotar todo lo
   relacionado.
3. **Si es Stripe live key**: revisar charges en las últimas 24h, abrir
   ticket con Stripe Support, considerar `Block all` temporal.
4. **Reescribir historia (último recurso)**: `git filter-repo` para borrar
   del histórico, force-push (coordinado con el equipo). Sólo si el secret
   estuvo público en GitHub.
5. Documentar el incidente en `docs/PRODUCTION_READINESS.md` §Incidentes.

## Lista de control antes de cada release

- [ ] `grep -r "sk_live\|sk_test_real\|whsec_" .` no encuentra nada
- [ ] gitleaks pasa en CI
- [ ] `.env` no aparece en `git status`
- [ ] `APP_DEBUG=false` en `.env` de production
- [ ] `APP_KEY` está seteado y NO es el de dev
- [ ] `STRIPE_DRIVER=stripe` (no `mock`) en production
- [ ] `WHATSAPP_DRIVER=meta` (no `log`) en production
- [ ] Webhook secrets configurados y probados con un evento de prueba

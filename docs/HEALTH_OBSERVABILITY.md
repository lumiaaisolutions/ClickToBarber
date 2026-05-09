# Health checks + observabilidad

## Healthchecks

### `/up` (Laravel default)

Verifica que PHP arranca y responde. Sin dependencias externas.
Útil para load balancer básico.

### `/api/up/deep` ✅

Verifica DB + Redis + Stripe + Meta + Mail. Devuelve 200 si todos OK,
503 si alguno falla. Output:

```json
{
  "ok": true,
  "service": "lumia-api",
  "version": "dev",
  "env": "production",
  "time": "2026-05-07T20:00:00Z",
  "checks": {
    "php":    { "ok": true, "detail": "8.3.10" },
    "db":     { "ok": true, "driver": "pgsql", "latency_ms": 4 },
    "redis":  { "ok": true, "reply": "PONG" },
    "stripe": { "ok": true, "status": 200 },
    "meta":   { "ok": "skipped", "reason": "no WHATSAPP_TOKEN" },
    "mail":   { "ok": true, "detail": "smtp" }
  }
}
```

`ok = "skipped"` significa "no configurado en este entorno" — no cuenta
como fallo (útil en dev/staging sin todas las creds).

### Página pública `/status` ✅

`frontend/src/app/status/page.tsx` consume `/api/up/deep` y muestra UI
con badges OK/down/skipped por sistema. Sin auth — pública para que
clientes puedan verificar incidentes.

Para `status.lumia.app` real: configurar el subdomain → este path en
producción. Alternativa: Statuspage.io / Better Stack para histórico
de incidentes con suscripciones.

## Rate limit por tenant

`App\Http\Common\Middleware\RateLimitByTenant` ✅

Default: 600 req/min/tenant. Configurable con `RATE_LIMIT_TENANT_PER_MIN`.
Aplicado al stack `api`. Sólo evalúa si hay tenant resuelto.

Headers de respuesta:
- `X-Tenant-RateLimit-Remaining: 432`

Combinado con `RateLimitByIp` (100/min/IP global) y throttles
específicos (`throttle:login`, `throttle:booking`, `throttle:webhook`).

## Logging estructurado

`RequestContext` middleware empuja `request_id`, `tenant_id`, `user_id`,
`ip`, `route` al contexto global de Log. Todo `Log::info()` posterior
los incluye automáticamente.

Header `X-Request-Id` siempre presente en respuestas (correlación).

## Métricas Prometheus

`/api/metrics` ✅ exporta:

- `lumia_appointments_total{status}` — counter por estado
- `lumia_subscriptions_total{status}` — counter
- `lumia_webhook_events_total{provider, status}` — webhooks recibidos
- `lumia_tenants_total` — gauge

Auth: por IP allowlist (127.0.0.1 en local; en prod detrás de auth basic
o red privada).

Dashboard JSON pre-configurado en
`infra/observability/grafana-dashboard.json` — importable directamente.

Alert rules en `infra/observability/prometheus-alerts.yml`:
- `WebhookFailureBurst` — > 10 fallos/5min
- `HighErrorRate` — 5xx > 1% en 10min
- `SlowAvailabilityP95` — p95 > 800ms
- `SubscriptionsPastDueGrowth` — +5/h
- `CircuitBreakerOpen` — abierto > 5min

## Sentry-compatible error reporter

`App\Infrastructure\Observability\ErrorReporter` ✅

Captura excepciones no manejadas vía `bootstrap/app.php` exception
handler. Compatible con Sentry / GlitchTip / Sentry self-hosted.

No-op si `SENTRY_DSN` vacío. Skipea ValidationException / 404 / 401 /
ThrottleRequestsException (no son bugs).

## Tracing OpenTelemetry

`App\Infrastructure\Observability\TracingHooks` 🟡 stub.

Cuando se instale `composer require open-telemetry/sdk
open-telemetry/exporter-otlp`:

1. Cambiar `TracingHooks::span()` para crear span real.
2. Apuntar `OTEL_EXPORTER_OTLP_ENDPOINT` al collector.
3. Collector config existe en `infra/observability/otel-collector.yaml`
   (Tempo + Prometheus + Loki).

Mientras tanto, `Tracing::span($name, $fn)` es no-op safe — el resto
del código puede llamarlo sin romper.

## Backups Postgres

Scripts en `infra/backups/`:

- `pg-backup.sh` — pg_dump diario + retención + S3 opcional + alerta
  Slack ante fallo.
- `pg-restore-test.sh` — test mensual de restore que compara conteo de
  tablas.

**Pendiente**: cron real en el servidor:

```bash
0 2 * * * /opt/lumia/infra/backups/pg-backup.sh
0 3 1 * * /opt/lumia/infra/backups/pg-restore-test.sh
```

Para PITR completo: activar WAL archiving en `postgresql.conf` +
`archive_command` apuntando a S3.

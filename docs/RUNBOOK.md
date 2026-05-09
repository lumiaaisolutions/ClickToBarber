# Runbook de incidentes

Guía operativa para el equipo on-call. Para cada tipo de incidente:
síntomas → diagnóstico → mitigación → postmortem.

## Stripe down / payments failing

**Síntomas**:
- Alerta `WebhookFailureBurst{provider="stripe"}`.
- Usuarios reportan "no puedo pagar".
- Dashboard Stripe muestra service degradation.

**Diagnóstico**:
1. Verificar `https://status.stripe.com`.
2. `php artisan tinker` → `App\Domain\Billing\Models\WebhookEvent::where('provider', 'stripe')->latest()->take(10)->get()`.
3. Revisar logs `storage/logs/laravel.log` por `Stripe webhook processing failed`.

**Mitigación**:
- Si Stripe entero está caído: no hay nada que hacer. El backend acepta
  webhooks reentregados gracias a `webhook_events` UNIQUE — cuando vuelva
  recibirá los retrasados.
- Si es config nuestra (webhook secret rotado mal): rollback al
  `STRIPE_WEBHOOK_SECRET` anterior.

**Postmortem**: documentar en `docs/SESSION_LOG.md`.

## WhatsApp rate limit (Meta)

**Síntomas**:
- Circuit breaker `whatsapp` abierto > 5 min.
- Logs `Meta WhatsApp send failed: 429`.

**Diagnóstico**:
1. ¿Burst inusual? — pico de citas creadas.
2. ¿Rate limit alcanzado en Meta Business Manager?
3. Verificar quality rating de las plantillas.

**Mitigación**:
- Circuit breaker bloquea automáticamente — los reintentos van a queue
  con backoff exponencial.
- Si la causa es quality rating bajo: detener envíos masivos manualmente
  con `php artisan tinker → Cache::set('whatsapp:paused', true, 3600)`
  (TODO: implementar el flag).

## Database connection pool exhausted

**Síntomas**:
- Errores 5xx genéricos.
- Logs: `SQLSTATE[08006] connection limit exceeded`.

**Mitigación**:
- Reiniciar workers Horizon: `php artisan horizon:terminate`.
- Si pgbouncer activo, restart su pool.
- Largo plazo: aumentar `max_connections` o introducir `pgbouncer`.

## Circuit breaker abierto > 10 min

Indica que una integración externa está consistentemente fallando.

**Diagnóstico**:
1. `Cache::get('cb:<integration>:<scope>:state')` → `open`.
2. Revisar logs de la integración.
3. ¿Ya intentó half-open? Si lleva > 10 min en `open`, probablemente.

**Mitigación**:
- Forzar reset: `app(\App\Infrastructure\CircuitBreaker\CircuitBreaker::class)->forceClose('whatsapp')`.
- Sólo después de confirmar que la integración real está sana.

## Tenant reporta "perdí mi cita"

**Diagnóstico**:
1. `php artisan tinker` → buscar por phone hash:
   `App\Domain\Identity\Models\User::findByPhone($tenantId, $phone)`.
2. Listar sus citas (incluyendo soft-deleted).
3. Revisar `appointment_status_history` por la transición.

**Mitigación**:
- Si fue auto-cancelada por `AutoCancelUnconfirmedAppointment`: explicar
  el flow al cliente.
- Si fue rollback de Stripe: revisar `webhook_events`.

## Backup mensual no se restauró

**Síntomas**: alerta del job `pg-restore-test.sh` falla.

**Mitigación inmediata**:
1. NO PANIQUEAR. Los backups diarios siguen creándose.
2. Ejecutar restore-test manualmente con el último dump:
   `bash infra/backups/pg-restore-test.sh`.
3. Si falla por corruption del dump, intentar el de ayer.
4. Si todos los backups recientes están corruptos: incidente
   mayor. Activar disaster recovery.

## Custom domain dejó de resolver

**Síntomas**: tenant reporta que `reservas.barberia.com` muestra 503.

**Diagnóstico**:
1. `dig _lumia-verify.reservas.barberia.com TXT` — ¿el TXT sigue ahí?
2. `php artisan lumia:reverify-domains --dry-run` — el cron ya lo
   habrá detectado.

**Mitigación**:
- Si el TXT desapareció (cliente borró el DNS), avisar al tenant para
  que lo reagregue. Mientras, `is_active = false` en `tenant_domains`.

## Performance degradado en /availability

**Síntomas**: alerta `SlowAvailabilityP95`.

**Diagnóstico**:
1. EXPLAIN del query principal de `AvailabilityCalculator`.
2. ¿Hay índice en `appointments(barber_id, starts_at)`? Debería.
3. ¿Tenant tiene tantas citas que el query escanea mucho?

**Mitigación**:
- Cache resultados con TTL 60s para `(barber_id, date)`. NO hecho aún
  para mantener slots reales-tiempo, pero válido si el SLA se vuelve
  problema.

## Contacto de escalación

- **Plataforma core**: nando.torres0987@gmail.com.
- **Stripe**: support@stripe.com con merchant ID.
- **Meta WhatsApp**: Business Help Center.
- **Twilio**: support@twilio.com con account SID.

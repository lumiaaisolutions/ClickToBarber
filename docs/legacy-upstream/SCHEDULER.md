# Scheduler — comandos artisan agendados

Definidos en `backend/routes/console.php`. Activar con:

```bash
# dev
php artisan schedule:work

# prod (cron del sistema)
* * * * * cd /var/lumia && php artisan schedule:run >> /dev/null 2>&1
```

| Comando | Frecuencia | Doc |
|---------|------------|-----|
| `lumia:enforce-dunning` | diario 03:00 | `PRODUCTION_READINESS.md` §B5 |
| `lumia:reverify-domains` | diario 04:00 | `CUSTOM_DOMAINS.md` |
| `lumia:expire-referrals` | diario 04:30 | `REFERRALS_LOYALTY.md` |
| `lumia:materialize-recurrences` | diario 05:00 | `RECURRING.md` |
| `lumia:purge-audit-logs` | semanal lun 02:00 | `AUDIT_LOG.md` |
| `lumia:pay-affiliate-commissions` | mensual día 1 06:00 | `AFFILIATES.md` |

Comandos manuales (no agendados):

| Comando | Para qué |
|---------|----------|
| `lumia:generate-vapid` | Generar keypair Web Push una sola vez |
| `lumia:push-test {user_id}` | Probar envío Web Push real |
| `lumia:rotate-pii-key` | Rotar APP_KEY con datos cifrados |

## Política de retries

- Comandos críticos (dunning, materialize) usan `withoutOverlapping()` — si
  uno tarda más de 1 min, el siguiente no arranca.
- `onOneServer()` en dunning evita doble ejecución en flota multi-server.
- Para fallos: el scheduler los re-intenta en la siguiente ejecución
  programada (no hay backoff exponencial — los comandos son idempotentes).

## Health del scheduler

`php artisan schedule:list` muestra todos los crons registrados.
`php artisan schedule:test` corre uno manualmente para debug.

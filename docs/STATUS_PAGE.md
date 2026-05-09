# Status page — plantilla

> Plantilla para `status.lumia.app` (público) que el equipo de ops mantiene
> manualmente. Para automatización, considerar Statuspage.io / Better Stack
> que ingieren healthchecks de `/up`.

## Sistemas a reportar

| Sistema | Health probe |
|---------|--------------|
| API LUMIA | `https://api.lumia.app/up` |
| Portal admin | `https://app.lumia.app/` |
| Reservas públicas | `https://app.lumia.app/b/{slug}` |
| WhatsApp Cloud | externo (Meta) |
| Stripe | externo (status.stripe.com) |
| Twilio | externo (status.twilio.com) |
| Google Calendar | externo (status.cloud.google.com) |

## Estados

- 🟢 **Operacional** — todos los sistemas responden < 1s sin errores.
- 🟡 **Parcialmente degradado** — un sistema responde lento o errores
  intermitentes (< 5%).
- 🔴 **Caído** — el sistema responde > 5xx o no responde.

## Plantilla incidente

```markdown
## YYYY-MM-DD HH:MM CDMX — [DEGRADADO/CAÍDO] Título corto

**Sistemas afectados**: API LUMIA · WhatsApp.
**Impacto**: ~30% de notificaciones de cita no se envían.

### Cronología
- HH:MM — detectado por alerta `WebhookFailureBurst`.
- HH:MM — investigando.
- HH:MM — identificado: rate limit Meta.
- HH:MM — resuelto.

### Causa raíz
...

### Acción correctiva
...

### Lecciones
- Aumentar buffer en circuit breaker antes de saturar Meta.
- Documentado en `docs/SESSION_LOG.md`.
```

## RSS / suscripciones

`status.lumia.app/rss` (TODO si lo hosteamos manual). Statuspage.io ya
incluye RSS, email y SMS opt-in.

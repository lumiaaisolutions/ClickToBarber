# Bitácora de auditoría

> Tabla `audit_logs` — historial inmutable de quién cambió qué, cuándo
> y desde dónde. Cubre disputas con barberos, auditorías y forense.
> Código: `app/Domain/Audit/{Models/AuditLog,AuditLogger,LoggableChanges}.php`.

## Cómo se llena

Tres mecanismos:

1. **Trait `LoggableChanges`** en modelos críticos: registra create/update/
   delete automáticamente con observers Eloquent. Aplicado a:
   - `User` (incluye redaction de password / 2FA secret)
   - `Tenant`
   - `TenantBranding`
   - `TenantDomain`
   - `Subscription`
2. **Llamadas explícitas** desde controllers (`AuditLogger::record(...)`):
   - login.success / login.failed
   - 2fa.enabled / 2fa.disabled
   - (extender en webhooks Stripe / Meta cuando hagamos integración real)
3. **`AuditLogger::recordModel($model, $changes)`** desde servicios de
   dominio cuando un cambio relevante ocurre fuera del ciclo Eloquent
   normal.

## Schema

```
audit_logs
├─ id
├─ tenant_id (uuid, indexed)
├─ actor_user_id (nullable — sistema cuando es null)
├─ actor_email (snapshot por si el user se borra)
├─ action          (created | updated | deleted | login.success | ...)
├─ subject_type    (FQCN del modelo)
├─ subject_id
├─ changes         (JSON: before/after o snapshot)
├─ ip_address
├─ request_id      (correlación con structured logs)
└─ created_at
```

## Redaction

`LoggableChanges` redacta automáticamente:

- `password`, `remember_token`
- `two_factor_secret`, `two_factor_recovery_codes`
- `token_hash`, `access_token`, `refresh_token`

Cualquier campo string de longitud > 500 chars se trunca a 500 + `…`.

## Vista admin

`/admin/audit` (solo `role:admin,manager`). Filtros por acción, paginación
por id desc, expansión de la columna `changes` para inspeccionar el diff.
Cada entrada muestra `actor` + `ip` + `request_id` para correlacionar con
logs estructurados (`X-Request-Id` header → Loki/Datadog).

## Retención

No hay job de purga automática. Recomendado: cron mensual que mueve
`created_at < now() - 365d` a un archive bucket (S3) o tabla `audit_logs_archive`.
Las jurisdicciones LATAM exigen 5 años para algunos eventos financieros — no
es necesario que vivan en la DB caliente.

## Privacy

`audit_logs` puede contener PII (emails, nombres). Cuando un cliente pide
borrado GDPR/LFPDPPP (`/api/admin/gdpr/clients/{id}` DELETE), se anonimiza
el user pero **no se borran sus audit_logs** — se mantiene el rastro
operativo para compliance, ahora apuntando a un email anonimizado.

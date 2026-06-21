# Compliance — GDPR / LFPDPPP / SOC2

## Cookie consent banner

Componente `frontend/src/components/CookieConsentBanner.tsx`. Por
defecto sólo cookies **estrictamente necesarias** (sesión, idioma).
Con consentimiento del usuario se podrán cargar cookies analíticas
(GA4 / similar).

Persiste decisión en `localStorage["lumia:cookie-consent"]`. Si el user
cierra sin decidir, se trata como rechazo (sólo necesarias).

## GDPR para clientes finales

Endpoints accesibles desde `/me` con magic link:

- `POST /api/public/me/data-export` — JSON con todos sus datos.
- `POST /api/public/me/data-deletion` — anonimiza inmediatamente.

GDPR Art. 15 (acceso) y Art. 17 (borrado) cumplidos sin pasar por admin.

## GDPR para admin (tenant-wide)

`/api/admin/gdpr/export` y `/api/admin/gdpr/clients/{id}` (DELETE).
Útil cuando un cliente pide su deletion por teléfono.

## PII access log

Tabla `pii_access_log` registra cada vez que se lee PII de clientes
finales. Helper `App\Domain\Audit\PiiAccessLogger::log(...)`.

Hoy cabuleado en:
- `MarketingController::__invoke` (lista de inactivos).
- `GdprController::export`.
- `ClientTimelineController::__invoke`.

UI en `/api/admin/security/pii-access` (admin/manager).

## Audit log de cambios

Trait `LoggableChanges` automático en User, Tenant, TenantBranding,
TenantDomain, Subscription. Registra create/update/delete con
redaction de password / 2FA secret / tokens. UI en `/admin/audit`.

## 2FA enforcement por tenant

Campo `tenants.security` (JSON) con `require_2fa: true`. Middleware
`EnforceTwoFactor` verifica:

- Si user tiene `two_factor_confirmed_at` → pasa.
- Si no, **y** el tenant tiene `require_2fa: true` → 403 con
  `redirect: /admin/security/2fa`.

Excepciones: rutas del propio setup de 2FA y logout.

Activación operativa (admin del tenant):

```php
$tenant->update(['security' => ['require_2fa' => true]]);
```

(UI para esto pendiente — cuando exista, en `/admin/security/policy`.)

## Password complexity

Hoy `min:6` en login (compat con accounts pre-policy).
**Para reset / change / nueva cuenta**: regla `StrongPassword::rule()`
que aplica `Password::min(10)->mixedCase()->numbers()->symbols()->uncompromised()`.

`uncompromised` consulta el HIBP API (k-anonymity, no envía el password
real).

## Rotación de APP_KEY con datos cifrados

Para rotar `APP_KEY` sin perder los teléfonos cifrados:

1. `php artisan key:generate --show` (no aplicar al .env aún).
2. Setear `APP_PREVIOUS_KEYS=<key-actual>` en gestor.
3. Promover la nueva como `APP_KEY`.
4. `php artisan lumia:rotate-pii-key` re-encripta `users.phone` y
   `users.notes` con la nueva key.
5. Tras 24h sin errores, borrar `APP_PREVIOUS_KEYS`.

## DPAs (Data Processing Agreements)

LUMIA actúa como **Encargado** y los tenants como **Responsable** de
los datos de sus clientes finales. Para cumplir GDPR Art. 28 hace
falta DPA firmado:

- LUMIA ↔ Stripe ✅ (DPA estándar Stripe).
- LUMIA ↔ Meta WhatsApp ✅ (DPA estándar Meta).
- LUMIA ↔ Twilio ✅.
- LUMIA ↔ Google Cloud (Calendar) ✅.
- LUMIA ↔ AWS / GCP (hosting) ✅.
- **LUMIA ↔ tenant**: plantilla en `docs/legal/dpa-template.md`
  (TODO redactar — abogado).

## Retención de datos

- `audit_logs`: 365 días (configurable, purga semanal vía cron).
- `pii_access_log`: 365 días (mismo cron — TODO añadir purge).
- `notifications_log`: indefinido (pequeño, no lo purgamos).
- `clients` (users role=client): mientras la suscripción del tenant
  esté activa. Tras cancelación, 90 días de gracia.

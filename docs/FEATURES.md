# LUMIA — Catálogo de features

> Mapa rápido de todos los módulos del sistema con su doc específico,
> rutas backend, paths frontend y dependencias.
>
> Estado: ✅ implementado · 🟡 parcial / falta integración real · 🔴 pendiente.

## Atajos por feature

| Doc | Cuándo leerlo |
|-----|---------------|
| `2FA.md` | Todo lo de TOTP + recovery codes |
| `AUDIT_LOG.md` | Quién cambió qué |
| `CALENDAR_SYNC.md` | Google OAuth + iCal feed |
| `CLIENT_PORTAL.md` | Mini portal `/me` para cliente final |
| `COMPLIANCE.md` | GDPR, cookies, PII access, 2FA enforce |
| `COUPONS.md` | CRUD cupones + bulk |
| `CUSTOM_DOMAINS.md` | White-label DNS por tenant |
| `MEMBERSHIPS.md` | Pre-pago mensual del cliente final |
| `GIFT_CARDS.md` | Certificados de regalo |
| `AFFILIATES.md` | Programa B2B (refiere otra barbería) |
| `PLATFORM_API.md` | Public API + webhooks salientes |
| `POS.md` | Tickets, cierre de caja, tip splitting |
| `PWA_PUSH.md` | PWA + Web Push VAPID |
| `RATINGS.md` | Calificaciones post-visita |
| `RECURRING.md` | Citas recurrentes |
| `REFERRALS_LOYALTY.md` | Loyalty + referidos cliente final |
| `RESPONSIVE.md` | Convenciones mobile/tablet/desktop |
| `SECRETS_RUNBOOK.md` | Rotación de credenciales |
| `SMART_FEATURES.md` | Smart slots + stock predictivo + galería |
| `STATUS_PAGE.md` | Plantilla pública de estado |
| `WALK_IN_QUEUE.md` | Fila virtual sin cita previa |
| `RUNBOOK.md` | Diagnóstico de incidentes |
| `openapi.yaml` | Spec OpenAPI 3.1 de la public API |

## Núcleo multi-tenant

| Módulo | Estado | Backend | Frontend | Doc |
|--------|--------|---------|----------|-----|
| Tenancy + RLS | 🟡 RLS solo activo en pgsql | `app/Domain/Tenancy/`, `app/Http/Common/Middleware/ResolveTenant.php` | `BrandingProvider` scoped | `PRODUCTION_READINESS.md` §B1 |
| Identity (User + roles) | ✅ | `app/Domain/Identity/Models/User.php` | `LoginForm`, `/admin/layout` | — |
| Cifrado PII | ✅ | `users.phone` y `notes` cast `encrypted` + `phone_hash` | — | `PRODUCTION_READINESS.md` §B4 |
| Audit log | ✅ | `app/Domain/Audit/` | `/admin/audit` | `AUDIT_LOG.md` |
| 2FA TOTP | ✅ | `app/Domain/Identity/Services/TotpService.php` | `/admin/security/2fa` | `2FA.md` |
| Custom domains | 🟡 código listo, infra DNS pendiente | `app/Http/Common/Middleware/ResolveTenantByHost.php` | `/admin/domains` | `CUSTOM_DOMAINS.md` |

## Operación de barbería

| Módulo | Estado | Backend | Frontend | Doc |
|--------|--------|---------|----------|-----|
| Agenda + slots | ✅ | `app/Domain/Scheduling/AvailabilityCalculator.php` | `/admin/agenda`, `BookingFlow` | — |
| Citas (book / confirm / cancel / complete) | ✅ | `app/Domain/Appointments/Services/*` | `/admin/agenda` con lifecycle | — |
| Staff + horarios | ✅ | `app/Http/Admin/Controllers/StaffController.php` | `/admin/staff` | — |
| Servicios | ✅ | `app/Http/Admin/Controllers/CatalogController.php` | `/admin/services` | — |
| Productos / POS | ✅ (gated `pos_inventory`) | `CatalogController::products*` | `/admin/pos` | — |
| Business hours | ✅ | `app/Http/Admin/Controllers/BusinessHoursController.php` | `/admin/business-hours` | — |
| Branding por tenant | ✅ | `BrandingController` | `/admin/identity` | `IDENTITY_SYSTEM.md`, `PRESETS.md` |

## Notificaciones

| Módulo | Estado | Backend | Doc |
|--------|--------|---------|-----|
| WhatsApp Cloud API | 🟡 cliente real listo, plantillas pendientes Meta | `app/Infrastructure/Integrations/MetaWhatsapp/MetaWhatsappClient.php` | `PRODUCTION_READINESS.md` §B3 |
| Twilio Voice | 🔴 stub | — | `PRODUCTION_READINESS.md` §I (no en bloqueantes ya) |
| Web Push (PWA) | 🟡 manifest + sw + suscripciones; envío VAPID pendiente | `PushSubscriptionController` | `PWA_PUSH.md` |
| Email transaccional | 🟡 mailable listo, driver `log` por defecto | `app/Mail/OnboardingMagicLink.php` | — |

## Crecimiento

| Módulo | Estado | Backend | Frontend | Doc |
|--------|--------|---------|----------|-----|
| Marketing retención | ✅ | `app/Domain/Marketing/Services/RetentionScan.php` | `/admin/marketing` | — |
| Loyalty program | ✅ | `app/Domain/Growth/Services/AwardLoyaltyVisit.php` | `/admin/loyalty` | `REFERRALS_LOYALTY.md` |
| Referidos | 🟡 emisión + listado, tracking de `?ref=` pendiente | `app/Domain/Growth/Services/IssueReferral.php` | `/admin/referrals` | `REFERRALS_LOYALTY.md` |
| Ratings post-visita | ✅ | `app/Domain/Engagement/` | `/r/<token>` (cliente público) | `RATINGS.md` |

## Billing y subscriptions

| Módulo | Estado | Backend | Frontend | Doc |
|--------|--------|---------|----------|-----|
| Plans (Free/Starter/Pro/Enterprise) | ✅ | `database/seeders/PlanSeeder.php` | `LandingPricing` | — |
| Stripe Checkout + provisión | 🟡 mock funciona end-to-end; live keys pendientes | `app/Domain/Billing/Services/CreateCheckoutSession.php` + `ProvisionTenant` | `CheckoutDialog`, `/checkout/success`, `/auth/magic` | `PRODUCTION_READINESS.md` §B2 |
| Webhooks Stripe (HMAC + idempotencia) | ✅ | `StripeWebhookController` | — | — |
| Dunning grace period | ✅ | `php artisan lumia:enforce-dunning` | — | — |
| MercadoPago | 🔴 stub | — | — |

## Integraciones

| Módulo | Estado | Backend | Frontend | Doc |
|--------|--------|---------|----------|-----|
| Google Calendar OAuth | 🟡 código listo, env vars pendientes | `app/Infrastructure/Integrations/Google/GoogleOauthClient.php` | `/admin/calendar` | `CALENDAR_SYNC.md` |
| iCal feed por barbero | ✅ | `IcalFeedController` | URL pública en `/api/ical/barber/<token>.ics` | `CALENDAR_SYNC.md` |

## Seguridad y compliance

| Módulo | Estado | Backend | Frontend | Doc |
|--------|--------|---------|----------|-----|
| Hardening (HMAC webhooks, throttle, CSP) | ✅ | `SecurityHeaders`, `VerifyWebhookSignature`, RateLimiter named | — | `PRODUCTION_READINESS.md` §B5 |
| Login alerts (IP/UA inusual) | ✅ | `LoginAlertService` | — | — |
| Gitleaks / secrets scan | ✅ | `.github/gitleaks.toml`, CI workflow | — | `SECRETS_RUNBOOK.md` |
| GDPR / LFPDPPP endpoints | ✅ | `GdprController` (export + delete) | links en `/cookies`, `/privacidad` | — |
| Páginas legales | ✅ texto plantilla | — | `/terminos`, `/privacidad`, `/cookies` | — |

## Observabilidad

| Módulo | Estado | Backend | Doc |
|--------|--------|---------|-----|
| Structured logs (request_id, tenant_id, user_id) | ✅ | `RequestContext` middleware | — |
| Sentry-compatible error reporter | 🟡 código listo, DSN pendiente | `app/Infrastructure/Observability/ErrorReporter.php` | — |
| Prometheus exporter `/api/metrics` | ✅ | `MetricsController` | — |
| Audit log de cambios | ✅ | (ver Núcleo) | `AUDIT_LOG.md` |

## DevOps

| Módulo | Estado | Path | Doc |
|--------|--------|------|-----|
| GitHub Actions CI | ✅ | `.github/workflows/ci.yml` | — |
| Docker prod | ✅ | `backend/Dockerfile.prod`, `frontend/Dockerfile.prod` | — |
| fly.toml | ✅ | `backend/fly.toml`, `frontend/fly.toml` | — |
| Tests Pest | ✅ 38/40 passed (2 pgsql-only skipped en SQLite) | `backend/tests/Feature/` | — |
| README operativo | ✅ | `README.md` | — |
| `.env.example` documentado | ✅ | `backend/.env.example`, `frontend/.env.local.example` | `SECRETS_RUNBOOK.md` |
| PWA install + service worker | ✅ | `frontend/public/sw.js`, `frontend/src/app/manifest.ts` | `PWA_PUSH.md` |

## Roadmap futuro

Las recomendaciones que NO se implementaron y se dejan documentadas
para iteraciones futuras:

- **Walk-in queue** (cliente sin cita escanea QR, se mete a cola virtual).
- **Galería antes/después** por barbero con consentimiento expreso.
- **Smart scheduling** (ML simple sugiere horarios con huecos).
- **CFDI 4.0** (facturación electrónica México vía Finkok/PAC).
- **Tip splitting** automático.
- **Stock predictivo** del POS.
- **App móvil del barbero** (React Native o Capacitor).
- **Marketplace de plugins** (Zapier-like, Mailchimp, Hubspot, Quickbooks).
- **SOC2 prep / pen test profesional**.
- **Bug bounty program** cuando haya prod traffic.
- **Storybook** de componentes UI premium.
- **OpenAPI auto-generado** con Scribe.
- **Renovate / Dependabot** + auto-merge de patches.
- **Bundle analyzer en CI** que falle si admin > 200 KB gzipped.

<?php

declare(strict_types=1);

use App\Http\Admin\Controllers\AdminDashboardController;
use App\Http\Admin\Controllers\AdminRatingsController;
use App\Http\Admin\Controllers\AffiliateAdminController;
use App\Http\Admin\Controllers\AgendaController;
use App\Http\Admin\Controllers\AppointmentLifecycleController;
use App\Http\Admin\Controllers\AppointmentRescheduleController;
use App\Http\Admin\Controllers\AuditLogController;
use App\Http\Admin\Controllers\BillingStatusController;
use App\Http\Admin\Controllers\CashCloseController;
use App\Http\Admin\Controllers\CfdiController;
use App\Http\Admin\Controllers\GiftCardController;
use App\Http\Admin\Controllers\GlobalSearchController;
use App\Http\Admin\Controllers\MembershipController;
use App\Http\Admin\Controllers\PosTicketController;
use App\Http\Admin\Controllers\SecurityPolicyController;
use App\Http\Admin\Controllers\BrandingController;
use App\Http\Admin\Controllers\BusinessHoursController;
use App\Http\Admin\Controllers\CalendarController;
use App\Http\Admin\Controllers\CatalogController;
use App\Http\Admin\Controllers\ClientTimelineController;
use App\Http\Admin\Controllers\InAppNotificationsController;
use App\Http\Admin\Controllers\CouponController;
use App\Http\Admin\Controllers\FinanceController;
use App\Http\Admin\Controllers\GdprController;
use App\Http\Admin\Controllers\LoyaltyController;
use App\Http\Admin\Controllers\ManualAppointmentController;
use App\Http\Admin\Controllers\MarketingController;
use App\Http\Admin\Controllers\PiiAccessController;
use App\Http\Admin\Controllers\PlanCatalogController;
use App\Http\Admin\Controllers\ReferralController;
use App\Http\Admin\Controllers\StaffController;
use App\Http\Admin\Controllers\TenantDomainController;
use App\Http\Admin\Controllers\TwoFactorController;
use App\Http\Admin\Controllers\WalkInQueueAdminController;
use App\Http\Client\Controllers\AvailabilityController;
use App\Http\Client\Controllers\BookAppointmentController;
use App\Http\Client\Controllers\ConfirmAppointmentController;
use App\Http\Client\Controllers\PublicTenantController;
use App\Http\Common\Controllers\AuthController;
use App\Http\Common\Controllers\PushSubscriptionController;
use App\Http\Admin\Controllers\PlatformController;
use App\Http\Admin\Controllers\SmartSchedulingController;
use App\Http\Admin\Controllers\StockForecastController;
use App\Http\Public\Controllers\CheckoutController;
use App\Http\Public\Controllers\ClientGdprController;
use App\Http\Public\Controllers\ClientPortalController;
use App\Http\Public\Controllers\IcalFeedController;
use App\Http\Public\Controllers\MagicLinkController;
use App\Http\Public\Controllers\PublicAffiliatesController;
use App\Http\Public\Controllers\PublicGiftCardController;
use App\Http\Public\Controllers\PublicMembershipsController;
use App\Http\Public\Controllers\RatingController;
use App\Http\Public\Controllers\WalkInQueueController;
use App\Http\Webhooks\Controllers\MetricsController;
use App\Http\Webhooks\Controllers\StripeWebhookController;
use App\Http\Webhooks\Controllers\WhatsappWebhookController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| LUMIA API
|--------------------------------------------------------------------------
| Convenciones:
|   - Toda ruta /api/* pasa por: RateLimitByIp + ResolveTenant.
|   - /api/admin/* requiere auth:sanctum (token Bearer del portal admin).
|   - /api/client/* es público (lectura) o protegido por feature gate.
|   - /api/tenant/{slug}/branding es público (hidrata BrandingProvider).
|   - /api/billing/plans y /api/health son públicos.
*/

Route::get('/health', fn () => ['ok' => true, 'service' => 'lumia-api', 'time' => now()->toIso8601String()]);

// Healthcheck profundo: DB + Redis + Stripe + Meta.
Route::get('/up/deep', \App\Http\Common\Controllers\DeepHealthController::class);

// Prometheus exporter — auth por IP allowlist en MetricsController.
Route::get('/metrics', MetricsController::class);

Route::get('/billing/plans', PlanCatalogController::class);

// ---------- AUTH ----------
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/auth/2fa/verify', [AuthController::class, 'verify2fa'])->middleware('throttle:login');
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});

// ---------- BRANDING público (hidrata BrandingProvider en /b/{slug}) ----------
Route::get('/tenant/{slug}/branding', [BrandingController::class, 'publicShow']);

// ---------- CHECKOUT público (Stripe / MercadoPago) ----------
Route::post('/public/checkout', CheckoutController::class)->middleware('throttle:booking');
Route::post('/public/magic/consume', MagicLinkController::class)->middleware('throttle:login');

// ---------- RATINGS públicos (post-visita) ----------
Route::get('/public/ratings/{token}',  [RatingController::class, 'show'])->where('token', '[A-Za-z0-9]+');
Route::post('/public/ratings/{token}', [RatingController::class, 'store'])->where('token', '[A-Za-z0-9]+');

// ---------- WEB PUSH (cliente o admin con sesión) ----------
Route::post('/push/subscribe',     [PushSubscriptionController::class, 'subscribe']);
Route::delete('/push/unsubscribe', [PushSubscriptionController::class, 'unsubscribe']);

// ---------- MINI PORTAL CLIENTE (magic link por email) ----------
Route::post('/public/me/login',         [ClientPortalController::class, 'requestLogin'])->middleware('throttle:login');
Route::post('/public/me/consume',       [ClientPortalController::class, 'consume'])->middleware('throttle:login');
Route::post('/public/me/data-export',   [ClientGdprController::class, 'export'])->middleware('throttle:login');
Route::post('/public/me/data-deletion', [ClientGdprController::class, 'delete'])->middleware('throttle:login');

// ---------- GIFT CARDS público ----------
Route::post('/public/giftcards/{slug}/checkout', [PublicGiftCardController::class, 'checkout'])->middleware('throttle:booking');
Route::get('/public/giftcards/{slug}/{code}',    [PublicGiftCardController::class, 'lookup'])->where('code', '[A-Z0-9\-]+');

// ---------- MEMBERSHIPS cliente final ----------
Route::post('/public/me/memberships',          [PublicMembershipsController::class, 'index'])->middleware('throttle:login');
Route::post('/public/me/memberships/checkout', [PublicMembershipsController::class, 'checkout'])->middleware('throttle:booking');

// ---------- AFFILIATES self-service ----------
Route::post('/public/affiliates/signup',    [PublicAffiliatesController::class, 'signup'])->middleware('throttle:login');
Route::post('/public/affiliates/dashboard', [PublicAffiliatesController::class, 'dashboard'])->middleware('throttle:login');
Route::post('/public/affiliates/connect/start',   [PublicAffiliatesController::class, 'connectStart'])->middleware('throttle:login');
Route::post('/public/affiliates/connect/refresh', [PublicAffiliatesController::class, 'connectRefresh'])->middleware('throttle:login');

// ---------- WALK-IN QUEUE público (QR físico de la barbería) ----------
Route::get('/public/queue/{slug}',       [WalkInQueueController::class, 'status']);
Route::post('/public/queue/{slug}/join', [WalkInQueueController::class, 'join'])->middleware('throttle:booking');

// ---------- WEBHOOKS de proveedores ----------
// HMAC validado por middleware. Idempotencia por UNIQUE(provider, event_id).
Route::post('/webhooks/stripe', StripeWebhookController::class)
    ->middleware(['webhook:stripe', 'throttle:webhook']);

// GET (verificación inicial Meta): sin HMAC, valida hub_verify_token internamente.
Route::get('/webhooks/whatsapp', WhatsappWebhookController::class)
    ->middleware('throttle:webhook');
// POST (eventos): HMAC X-Hub-Signature-256 obligatorio.
Route::post('/webhooks/whatsapp', WhatsappWebhookController::class)
    ->middleware(['webhook:meta', 'throttle:webhook']);

// ---------- PORTAL CLIENTE (público) ----------
Route::prefix('client')->group(function () {
    Route::get('/tenants/{slug}', PublicTenantController::class);
    Route::get('/availability', AvailabilityController::class);
    Route::post('/appointments', BookAppointmentController::class)->middleware('throttle:booking');
    Route::post('/appointments/{id}/confirm', ConfirmAppointmentController::class)->middleware('throttle:booking');
});

// ---------- PORTAL ADMIN (Sanctum) ----------
Route::prefix('admin')->middleware(['auth:sanctum', 'force2fa'])->group(function () {
    // ---- Dashboard / lectura general (cualquier rol del portal) ----
    Route::get('/dashboard', AdminDashboardController::class);
    Route::get('/agenda',    AgendaController::class);

    // ---- Branding ----
    Route::get('/branding',                       [BrandingController::class, 'show']);
    Route::put('/branding',                       [BrandingController::class, 'update']);
    Route::post('/onboarding/complete',           [BrandingController::class, 'completeOnboarding']);

    // ---- Staff (CRUD admin/manager + "mis horarios" para barbero) ----
    Route::get('/staff',                          [StaffController::class, 'index']);
    Route::post('/staff',                         [StaffController::class, 'store'])
        ->middleware('role:admin,manager');
    Route::put('/staff/{id}',                     [StaffController::class, 'update'])
        ->middleware('role:admin,manager')->where('id', '[0-9]+');
    Route::delete('/staff/{id}',                  [StaffController::class, 'destroy'])
        ->middleware('role:admin,manager')->where('id', '[0-9]+');
    Route::get('/staff/me/schedule',              [StaffController::class, 'mySchedule']);
    Route::put('/staff/me/schedule',              [StaffController::class, 'updateMySchedule']);

    // ---- Catalog (Services CRUD) ----
    Route::get('/catalog/services',               [CatalogController::class, 'services']);
    Route::post('/catalog/services',              [CatalogController::class, 'storeService'])
        ->middleware('role:admin,manager');
    Route::put('/catalog/services/{id}',          [CatalogController::class, 'updateService'])
        ->middleware('role:admin,manager')->where('id', '[0-9]+');
    Route::delete('/catalog/services/{id}',       [CatalogController::class, 'destroyService'])
        ->middleware('role:admin,manager')->where('id', '[0-9]+');

    // ---- Catalog (Products CRUD, gated POS feature) ----
    Route::get('/catalog/products',               [CatalogController::class, 'products'])
        ->middleware('feature:pos_inventory');
    Route::post('/catalog/products',              [CatalogController::class, 'storeProduct'])
        ->middleware(['feature:pos_inventory', 'role:admin,manager']);
    Route::put('/catalog/products/{id}',          [CatalogController::class, 'updateProduct'])
        ->middleware(['feature:pos_inventory', 'role:admin,manager'])->where('id', '[0-9]+');
    Route::delete('/catalog/products/{id}',       [CatalogController::class, 'destroyProduct'])
        ->middleware(['feature:pos_inventory', 'role:admin,manager'])->where('id', '[0-9]+');

    // ---- Business hours (horario público del local) ----
    Route::get('/business-hours',                 [BusinessHoursController::class, 'index']);
    Route::put('/business-hours',                 [BusinessHoursController::class, 'update'])
        ->middleware('role:admin,manager');

    // ---- GDPR / LFPDPPP ----
    Route::get('/gdpr/export',                    [GdprController::class, 'export']);
    Route::delete('/gdpr/clients/{userId}',       [GdprController::class, 'deleteClient'])
        ->where('userId', '[0-9]+');

    // ---- 2FA del propio usuario ----
    Route::get('/security/2fa',                   [TwoFactorController::class, 'status']);
    Route::post('/security/2fa/setup',            [TwoFactorController::class, 'setup']);
    Route::post('/security/2fa/confirm',          [TwoFactorController::class, 'confirm']);
    Route::post('/security/2fa/disable',          [TwoFactorController::class, 'disable']);
    Route::post('/security/2fa/regenerate-codes', [TwoFactorController::class, 'regenerateCodes']);

    // ---- Audit log ----
    Route::get('/audit',                          [AuditLogController::class, 'index'])
        ->middleware('role:admin,manager');

    // ---- PII access log (compliance) ----
    Route::get('/security/pii-access',            PiiAccessController::class)
        ->middleware('role:admin,manager');

    // ---- Notificaciones in-app ----
    Route::get('/notifications',                  [InAppNotificationsController::class, 'index']);
    Route::post('/notifications/read',            [InAppNotificationsController::class, 'readAll']);
    Route::post('/notifications/{id}/read',       [InAppNotificationsController::class, 'readOne'])->where('id', '[0-9]+');

    // ---- Timeline del cliente ----
    Route::get('/clients/{id}/timeline',          ClientTimelineController::class)
        ->where('id', '[0-9]+')->middleware('role:admin,manager,receptionist');

    // ---- Appointment lifecycle ----
    Route::post('/appointments/{id}/complete',    [AppointmentLifecycleController::class, 'complete'])->where('id', '[0-9]+');
    Route::post('/appointments/{id}/cancel',      [AppointmentLifecycleController::class, 'cancel'])->where('id', '[0-9]+');
    Route::post('/appointments/{id}/confirm',     [AppointmentLifecycleController::class, 'confirm'])->where('id', '[0-9]+');

    // ---- Loyalty ----
    Route::get('/loyalty',                        [LoyaltyController::class, 'show']);
    Route::put('/loyalty',                        [LoyaltyController::class, 'update'])->middleware('role:admin,manager');
    Route::get('/loyalty/rewards',                [LoyaltyController::class, 'rewards']);

    // ---- Referrals ----
    Route::get('/referrals',                      [ReferralController::class, 'index']);
    Route::post('/referrals',                     [ReferralController::class, 'store'])->middleware('role:admin,manager');

    // ---- Calendar sync (Google OAuth) ----
    Route::get('/calendar',                       [CalendarController::class, 'status']);
    Route::post('/calendar/google/start',         [CalendarController::class, 'googleStart']);
    Route::post('/calendar/disconnect',           [CalendarController::class, 'disconnect']);

    // ---- Custom domains (white-label completo) ----
    Route::get('/domains',                        [TenantDomainController::class, 'index']);
    Route::post('/domains',                       [TenantDomainController::class, 'store'])->middleware('role:admin,manager');
    Route::post('/domains/{id}/verify',           [TenantDomainController::class, 'verify'])->middleware('role:admin,manager')->where('id', '[0-9]+');
    Route::post('/domains/{id}/primary',          [TenantDomainController::class, 'makePrimary'])->middleware('role:admin,manager')->where('id', '[0-9]+');
    Route::delete('/domains/{id}',                [TenantDomainController::class, 'destroy'])->middleware('role:admin,manager')->where('id', '[0-9]+');

    // ---- Cita manual + reschedule (admin/manager/receptionist) ----
    Route::post('/appointments',                  [ManualAppointmentController::class, 'store']);
    Route::post('/appointments/{id}/reschedule',  AppointmentRescheduleController::class)->where('id', '[0-9]+');

    // ---- Búsqueda global (Cmd+K) ----
    Route::get('/search',                         GlobalSearchController::class);

    // ---- Billing real ----
    Route::get('/billing/status',                 BillingStatusController::class);

    // ---- Security policy (admin only) ----
    Route::get('/security/policy',                [SecurityPolicyController::class, 'show']);
    Route::put('/security/policy',                [SecurityPolicyController::class, 'update']);

    // ---- POS ticketing ----
    Route::post('/pos/tickets',                   [PosTicketController::class, 'store']);

    // ---- Cierre de caja ----
    Route::get('/cash-close',                     [CashCloseController::class, 'preview']);
    Route::post('/cash-close',                    [CashCloseController::class, 'store']);

    // ---- CFDI 4.0 (MX) ----
    Route::get('/cfdi',                           [CfdiController::class, 'index']);
    Route::post('/cfdi/{appointment}',            [CfdiController::class, 'store'])->where('appointment', '[0-9]+');
    Route::get('/cfdi/{id}/xml',                  [CfdiController::class, 'downloadXml'])->where('id', '[0-9]+');

    // ---- Memberships ----
    Route::get('/memberships',                    [MembershipController::class, 'index']);
    Route::post('/memberships',                   [MembershipController::class, 'store'])->middleware('role:admin,manager');
    Route::put('/memberships/{id}',               [MembershipController::class, 'update'])->middleware('role:admin,manager')->where('id', '[0-9]+');
    Route::delete('/memberships/{id}',            [MembershipController::class, 'destroy'])->middleware('role:admin,manager')->where('id', '[0-9]+');

    // ---- Gift cards ----
    Route::get('/giftcards',                      [GiftCardController::class, 'index']);
    Route::post('/giftcards',                     [GiftCardController::class, 'store'])->middleware('role:admin,manager');
    Route::get('/giftcards/{code}',               [GiftCardController::class, 'lookup'])->where('code', '[A-Z0-9\-]+');

    // ---- Affiliates (sólo platform_owner) ----
    Route::get('/affiliates',                     [AffiliateAdminController::class, 'index']);
    Route::post('/affiliates',                    [AffiliateAdminController::class, 'store']);

    // ---- Walk-in queue (admin) ----
    Route::get('/queue',                          [WalkInQueueAdminController::class, 'index']);
    Route::post('/queue/{id}/call',               [WalkInQueueAdminController::class, 'call'])->where('id', '[0-9]+');
    Route::post('/queue/{id}/serve',              [WalkInQueueAdminController::class, 'serve'])->where('id', '[0-9]+');
    Route::post('/queue/{id}/abandon',            [WalkInQueueAdminController::class, 'abandon'])->where('id', '[0-9]+');

    // ---- Cupones ----
    Route::get('/coupons',                        [CouponController::class, 'index']);
    Route::post('/coupons',                       [CouponController::class, 'store'])->middleware('role:admin,manager');
    Route::post('/coupons/bulk',                  [CouponController::class, 'bulk'])->middleware('role:admin,manager');
    Route::delete('/coupons/{id}',                [CouponController::class, 'destroy'])
        ->middleware('role:admin,manager')->where('id', '[0-9]+');

    // ---- Ratings (admin) ----
    Route::get('/ratings',                        [AdminRatingsController::class, 'index']);
    Route::post('/ratings/{id}/publish',          [AdminRatingsController::class, 'publish'])->where('id', '[0-9]+');
    Route::post('/ratings/{id}/unpublish',        [AdminRatingsController::class, 'unpublish'])->where('id', '[0-9]+');

    // ---- Marketing & Finance ----
    Route::get('/marketing/inactive', MarketingController::class)
        ->middleware('feature:marketing_retention');
    Route::get('/finance/summary', FinanceController::class)
        ->middleware(['feature:finance_reports', 'role:admin,manager']);

    // ---- Insights (smart scheduling, stock forecast) ----
    Route::get('/insights/smart-slots',     SmartSchedulingController::class);
    Route::get('/insights/stock-forecast',  StockForecastController::class)
        ->middleware('feature:pos_inventory');

    // ---- Platform: API keys + webhooks salientes (Enterprise) ----
    Route::get('/platform/keys',                  [PlatformController::class, 'listKeys']);
    Route::post('/platform/keys',                 [PlatformController::class, 'issueKey']);
    Route::post('/platform/keys/{id}/revoke',     [PlatformController::class, 'revokeKey'])->where('id', '[0-9]+');
    Route::get('/platform/webhooks',              [PlatformController::class, 'listWebhooks']);
    Route::post('/platform/webhooks',             [PlatformController::class, 'createWebhook']);
    Route::delete('/platform/webhooks/{id}',      [PlatformController::class, 'deleteWebhook'])->where('id', '[0-9]+');
});

// ---------- API PÚBLICA (autenticada por API key Bearer lk_xxx) ----------
Route::prefix('v1')->middleware('apikey')->group(function () {
    Route::get('/appointments', function () {
        $tenant = app(\App\Domain\Tenancy\CurrentTenant::class)->require();
        return \App\Domain\Appointments\Models\Appointment::query()
            ->where('tenant_id', $tenant->id)
            ->orderByDesc('starts_at')
            ->limit(100)
            ->get(['id', 'starts_at', 'ends_at', 'status', 'price_cents', 'deposit_cents']);
    })->middleware('apikey:appointments:read');

    Route::get('/me', function () {
        $tenant = app(\App\Domain\Tenancy\CurrentTenant::class)->require();
        return ['tenant' => ['id' => $tenant->id, 'slug' => $tenant->slug, 'name' => $tenant->name]];
    });
});

// Callback de Google OAuth: SIN auth Sanctum (la identidad viaja en `state`).
Route::get('/admin/calendar/google/callback', [CalendarController::class, 'googleCallback']);

// iCal feed por barbero (público, token único en URL).
Route::get('/ical/barber/{token}', IcalFeedController::class)
    ->where('token', '[A-Za-z0-9_\-\.]+');

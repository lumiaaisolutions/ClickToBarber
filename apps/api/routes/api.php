<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| ClickToBarber API
|--------------------------------------------------------------------------
| Convenciones:
|   - Toda ruta /api/* pasa por: SecurityHeaders + RateLimitByIp +
|     ResolveTenant + RequestContext (configurado en bootstrap/app.php).
|   - /api/admin/* requiere auth:sanctum (Bearer token del portal admin).
|   - /api/client/* es público (lectura) o protegido por feature gate.
|   - /api/tenant/{slug}/branding es público.
|   - /api/billing/plans y /up son públicos.
|
| FORK ClickToBarber — features cortadas vs upstream Sistema_Barberia:
|   ❌ 2FA TOTP            (rutas /auth/2fa/* y /admin/security/2fa/*)
|   ❌ Audit log           (ruta /admin/audit)
|   ❌ CFDI 4.0 MX         (rutas /admin/cfdi/*)
|   ❌ Custom domains      (rutas /admin/domains/*)
|   ❌ PWA push            (rutas /push/*)
*/

use App\Http\Admin\Controllers\AdminDashboardController;
use App\Http\Admin\Controllers\AdminRatingsController;
use App\Http\Admin\Controllers\AffiliateAdminController;
use App\Http\Admin\Controllers\AgendaController;
use App\Http\Admin\Controllers\AppointmentLifecycleController;
use App\Http\Admin\Controllers\AppointmentRescheduleController;
use App\Http\Admin\Controllers\BillingActivateExistingController;
use App\Http\Admin\Controllers\BillingPortalController;
use App\Http\Admin\Controllers\BillingStatusController;
use App\Http\Admin\Controllers\BrandingController;
use App\Http\Admin\Controllers\BusinessHoursController;
use App\Http\Admin\Controllers\CalendarController;
use App\Http\Admin\Controllers\CashCloseController;
use App\Http\Admin\Controllers\CatalogController;
use App\Http\Admin\Controllers\ClientTimelineController;
use App\Http\Admin\Controllers\CouponController;
use App\Http\Admin\Controllers\FinanceController;
use App\Http\Admin\Controllers\GdprController;
use App\Http\Admin\Controllers\GiftCardController;
use App\Http\Admin\Controllers\GlobalSearchController;
use App\Http\Admin\Controllers\InAppNotificationsController;
use App\Http\Admin\Controllers\LoyaltyController;
use App\Http\Admin\Controllers\ManualAppointmentController;
use App\Http\Admin\Controllers\MarketingController;
use App\Http\Admin\Controllers\MembershipController;
use App\Http\Admin\Controllers\PiiAccessController;
use App\Http\Admin\Controllers\PlanCatalogController;
use App\Http\Admin\Controllers\PlatformController;
use App\Http\Admin\Controllers\PlatformTenantsController;
use App\Http\Admin\Controllers\PlatformUsersController;
use App\Http\Admin\Controllers\PosTicketController;
use App\Http\Admin\Controllers\ReferralController;
use App\Http\Admin\Controllers\SecurityPolicyController;
use App\Http\Admin\Controllers\SmartSchedulingController;
use App\Http\Admin\Controllers\StaffController;
use App\Http\Admin\Controllers\StockForecastController;
use App\Http\Admin\Controllers\WalkInQueueAdminController;
use App\Http\Client\Controllers\AvailabilityController;
use App\Http\Client\Controllers\BookAppointmentController;
use App\Http\Client\Controllers\ConfirmAppointmentController;
use App\Http\Client\Controllers\PublicTenantController;
use App\Http\Common\Controllers\AuthController;
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

Route::get('/health', fn () => ['ok' => true, 'service' => 'clicktobarber-api', 'time' => now()->toIso8601String()]);

// Deep healthcheck (DB + Stripe + Meta). Skipea Redis en ClickToBarber.
Route::get('/up/deep', \App\Http\Common\Controllers\DeepHealthController::class);

// Prometheus exporter — auth por IP allowlist en el controller.
Route::get('/metrics', MetricsController::class);

Route::get('/billing/plans', PlanCatalogController::class);

// ---------- AUTH ----------
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
// CUT: 2FA TOTP — Route::post('/auth/2fa/verify', ...) removed in ClickToBarber fork
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});

// ---------- BRANDING público ----------
Route::get('/tenant/{slug}/branding', [BrandingController::class, 'publicShow']);

// ---------- CHECKOUT público (Stripe) ----------
Route::post('/public/checkout', CheckoutController::class)->middleware('throttle:booking');
Route::post('/public/magic/consume', MagicLinkController::class)->middleware('throttle:login');

// ---------- RATINGS post-visita ----------
Route::get('/public/ratings/{token}',  [RatingController::class, 'show'])->where('token', '[A-Za-z0-9]+');
Route::post('/public/ratings/{token}', [RatingController::class, 'store'])->where('token', '[A-Za-z0-9]+');

// CUT: PWA push subscriptions — /push/subscribe + /push/unsubscribe removed

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

// ---------- WALK-IN QUEUE público ----------
Route::get('/public/queue/{slug}',       [WalkInQueueController::class, 'status']);
Route::post('/public/queue/{slug}/join', [WalkInQueueController::class, 'join'])->middleware('throttle:booking');

// ---------- WEBHOOKS ----------
Route::post('/webhooks/stripe', StripeWebhookController::class)
    ->middleware(['webhook:stripe', 'throttle:webhook']);

Route::get('/webhooks/whatsapp', WhatsappWebhookController::class)
    ->middleware('throttle:webhook');
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
// CUT: 'force2fa' middleware removido — sin 2FA TOTP en ClickToBarber.
Route::prefix('admin')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/dashboard', AdminDashboardController::class);
    Route::get('/agenda',    AgendaController::class);

    // ---- Branding ----
    Route::get('/branding',                       [BrandingController::class, 'show']);
    Route::put('/branding',                       [BrandingController::class, 'update']);
    Route::post('/onboarding/complete',           [BrandingController::class, 'completeOnboarding']);

    // ---- Staff ----
    Route::get('/staff',                          [StaffController::class, 'index']);
    Route::post('/staff',                         [StaffController::class, 'store'])
        ->middleware('role:admin,manager');
    Route::put('/staff/{id}',                     [StaffController::class, 'update'])
        ->middleware('role:admin,manager')->where('id', '[0-9]+');
    Route::delete('/staff/{id}',                  [StaffController::class, 'destroy'])
        ->middleware('role:admin,manager')->where('id', '[0-9]+');
    Route::get('/staff/me/schedule',              [StaffController::class, 'mySchedule']);
    Route::put('/staff/me/schedule',              [StaffController::class, 'updateMySchedule']);

    // ---- Catalog (Services) ----
    Route::get('/catalog/services',               [CatalogController::class, 'services']);
    Route::post('/catalog/services',              [CatalogController::class, 'storeService'])
        ->middleware('role:admin,manager');
    Route::put('/catalog/services/{id}',          [CatalogController::class, 'updateService'])
        ->middleware('role:admin,manager')->where('id', '[0-9]+');
    Route::delete('/catalog/services/{id}',       [CatalogController::class, 'destroyService'])
        ->middleware('role:admin,manager')->where('id', '[0-9]+');

    // ---- Catalog (Products — POS gated) ----
    Route::get('/catalog/products',               [CatalogController::class, 'products'])
        ->middleware('feature:pos_inventory');
    Route::post('/catalog/products',              [CatalogController::class, 'storeProduct'])
        ->middleware(['feature:pos_inventory', 'role:admin,manager']);
    Route::put('/catalog/products/{id}',          [CatalogController::class, 'updateProduct'])
        ->middleware(['feature:pos_inventory', 'role:admin,manager'])->where('id', '[0-9]+');
    Route::delete('/catalog/products/{id}',       [CatalogController::class, 'destroyProduct'])
        ->middleware(['feature:pos_inventory', 'role:admin,manager'])->where('id', '[0-9]+');

    // ---- Business hours ----
    Route::get('/business-hours',                 [BusinessHoursController::class, 'index']);
    Route::put('/business-hours',                 [BusinessHoursController::class, 'update'])
        ->middleware('role:admin,manager');

    // ---- GDPR / LFPDPPP ----
    Route::get('/gdpr/export',                    [GdprController::class, 'export']);
    Route::delete('/gdpr/clients/{userId}',       [GdprController::class, 'deleteClient'])
        ->where('userId', '[0-9]+');

    // CUT: 2FA TOTP — todas las rutas /security/2fa/* removidas
    // CUT: Audit log — ruta /audit removida

    // ---- PII access log (compliance, sin escritura, solo lectura admin) ----
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

    // ---- Calendar sync (Google) ----
    Route::get('/calendar',                       [CalendarController::class, 'status']);
    Route::post('/calendar/google/start',         [CalendarController::class, 'googleStart']);
    Route::post('/calendar/disconnect',           [CalendarController::class, 'disconnect']);

    // CUT: Custom domains — todas las rutas /domains/* removidas

    // ---- Cita manual + reschedule ----
    Route::post('/appointments',                  [ManualAppointmentController::class, 'store']);
    Route::post('/appointments/{id}/reschedule',  AppointmentRescheduleController::class)->where('id', '[0-9]+');

    // ---- Búsqueda global (Cmd+K) ----
    Route::get('/search',                         GlobalSearchController::class);

    // ---- Billing ----
    Route::get('/billing/status',                 BillingStatusController::class);
    Route::post('/billing/activate-existing',     BillingActivateExistingController::class)
        ->middleware('role:admin');
    Route::post('/billing/portal',                BillingPortalController::class)
        ->middleware('role:admin');

    // ---- Security policy ----
    Route::get('/security/policy',                [SecurityPolicyController::class, 'show']);
    Route::put('/security/policy',                [SecurityPolicyController::class, 'update']);

    // ---- POS ----
    Route::post('/pos/tickets',                   [PosTicketController::class, 'store']);

    // ---- Cierre de caja ----
    Route::get('/cash-close',                     [CashCloseController::class, 'preview']);
    Route::post('/cash-close',                    [CashCloseController::class, 'store']);

    // CUT: CFDI 4.0 MX — todas las rutas /cfdi/* removidas

    // ---- Memberships ----
    Route::get('/memberships',                    [MembershipController::class, 'index']);
    Route::post('/memberships',                   [MembershipController::class, 'store'])->middleware('role:admin,manager');
    Route::put('/memberships/{id}',               [MembershipController::class, 'update'])->middleware('role:admin,manager')->where('id', '[0-9]+');
    Route::delete('/memberships/{id}',            [MembershipController::class, 'destroy'])->middleware('role:admin,manager')->where('id', '[0-9]+');

    // ---- Gift cards ----
    Route::get('/giftcards',                      [GiftCardController::class, 'index']);
    Route::post('/giftcards',                     [GiftCardController::class, 'store'])->middleware('role:admin,manager');
    Route::get('/giftcards/{code}',               [GiftCardController::class, 'lookup'])->where('code', '[A-Z0-9\-]+');

    // ---- Affiliates ----
    Route::get('/affiliates',                     [AffiliateAdminController::class, 'index']);
    Route::post('/affiliates',                    [AffiliateAdminController::class, 'store']);

    // ---- Walk-in queue ----
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

    // ---- Insights ----
    Route::get('/insights/smart-slots',     SmartSchedulingController::class);
    Route::get('/insights/stock-forecast',  StockForecastController::class)
        ->middleware('feature:pos_inventory');

    // ---- Platform API ----
    Route::get('/platform/keys',                  [PlatformController::class, 'listKeys']);
    Route::post('/platform/keys',                 [PlatformController::class, 'issueKey']);
    Route::post('/platform/keys/{id}/revoke',     [PlatformController::class, 'revokeKey'])->where('id', '[0-9]+');
    Route::get('/platform/webhooks',              [PlatformController::class, 'listWebhooks']);
    Route::post('/platform/webhooks',             [PlatformController::class, 'createWebhook']);
    Route::delete('/platform/webhooks/{id}',      [PlatformController::class, 'deleteWebhook'])->where('id', '[0-9]+');

    // ---- LUMIA Super Admin (platform_owner only) ----
    Route::middleware('role:platform_owner')->prefix('superadmin')->group(function () {
        Route::get('/tenants',         [PlatformTenantsController::class, 'index']);
        Route::get('/tenants/{id}',    [PlatformTenantsController::class, 'show'])->where('id', '[0-9a-f\-]+');
        Route::patch('/tenants/{id}',  [PlatformTenantsController::class, 'update'])->where('id', '[0-9a-f\-]+');
        Route::get('/users',           [PlatformUsersController::class, 'index']);
        Route::patch('/users/{id}',    [PlatformUsersController::class, 'update'])->where('id', '[0-9]+');
        Route::get('/stats',           [PlatformTenantsController::class, 'stats']);
    });
});

// ---------- API PÚBLICA (auth por API key Bearer lk_xxx) ----------
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

// Callback de Google OAuth Calendar
Route::get('/admin/calendar/google/callback', [CalendarController::class, 'googleCallback']);

// iCal feed por barbero (público, token único)
Route::get('/ical/barber/{token}', IcalFeedController::class)
    ->where('token', '[A-Za-z0-9_\-\.]+');

<?php

declare(strict_types=1);

use App\Http\Admin\Controllers\AdminDashboardController;
use App\Http\Admin\Controllers\AgendaController;
use App\Http\Admin\Controllers\BrandingController;
use App\Http\Admin\Controllers\CatalogController;
use App\Http\Admin\Controllers\FinanceController;
use App\Http\Admin\Controllers\MarketingController;
use App\Http\Admin\Controllers\PlanCatalogController;
use App\Http\Admin\Controllers\StaffController;
use App\Http\Client\Controllers\AvailabilityController;
use App\Http\Client\Controllers\BookAppointmentController;
use App\Http\Client\Controllers\ConfirmAppointmentController;
use App\Http\Client\Controllers\PublicTenantController;
use App\Http\Common\Controllers\AuthController;
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

Route::get('/billing/plans', PlanCatalogController::class);

// ---------- AUTH ----------
Route::post('/auth/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});

// ---------- BRANDING público (hidrata BrandingProvider en /b/{slug}) ----------
Route::get('/tenant/{slug}/branding', [BrandingController::class, 'publicShow']);

// ---------- PORTAL CLIENTE (público) ----------
Route::prefix('client')->group(function () {
    Route::get('/tenants/{slug}', PublicTenantController::class);
    Route::get('/availability', AvailabilityController::class);
    Route::post('/appointments', BookAppointmentController::class);
    Route::post('/appointments/{id}/confirm', ConfirmAppointmentController::class);
});

// ---------- PORTAL ADMIN (Sanctum) ----------
Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
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

    // ---- Marketing & Finance ----
    Route::get('/marketing/inactive', MarketingController::class)
        ->middleware('feature:marketing_retention');
    Route::get('/finance/summary', FinanceController::class)
        ->middleware(['feature:finance_reports', 'role:admin,manager']);
});

<?php

declare(strict_types=1);

use App\Http\Admin\Controllers\AdminDashboardController;
use App\Http\Admin\Controllers\AgendaController;
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
| BarberPro API
|--------------------------------------------------------------------------
| Convenciones:
|   - Toda ruta /api/* pasa por: RateLimitByIp + ResolveTenant.
|   - /api/admin/* requiere auth:sanctum (token Bearer del portal admin).
|   - /api/client/* es público (lectura) o protegido por feature gate.
|   - /api/billing/plans y /api/health son públicos para landing/healthcheck.
*/

Route::get('/health', fn () => ['ok' => true, 'service' => 'barberpro-api', 'time' => now()->toIso8601String()]);

Route::get('/billing/plans', PlanCatalogController::class);

// ---------- AUTH (Sanctum personal access tokens) ----------
Route::post('/auth/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});

// ---------- PORTAL CLIENTE (público) ----------
Route::prefix('client')->group(function () {
    Route::get('/tenants/{slug}', PublicTenantController::class);
    Route::get('/availability', AvailabilityController::class);
    Route::post('/appointments', BookAppointmentController::class);
    Route::post('/appointments/{id}/confirm', ConfirmAppointmentController::class);
});

// ---------- PORTAL ADMIN (requiere Sanctum + tenant) ----------
Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
    Route::get('/dashboard', AdminDashboardController::class);
    Route::get('/agenda', AgendaController::class);
    Route::get('/staff', StaffController::class);
    Route::get('/catalog/services', [CatalogController::class, 'services']);
    Route::get('/catalog/products', [CatalogController::class, 'products'])
        ->middleware('feature:pos_inventory');
    Route::get('/marketing/inactive', MarketingController::class)
        ->middleware('feature:marketing_retention');
    Route::get('/finance/summary', FinanceController::class)
        ->middleware('feature:finance_reports');
});

<?php

declare(strict_types=1);

use App\Domain\Catalog\Models\Service;
use App\Domain\Tenancy\Models\Tenant;
use App\Infrastructure\Persistence\Tenancy\TenantScope;
use Illuminate\Support\Facades\DB;

/**
 * Aislamiento entre tenants — defensa en profundidad.
 *
 * Dos niveles:
 *   1) `TenantScope` global de Eloquent: las queries por defecto sólo ven
 *      el tenant actual. Funciona en SQLite y PostgreSQL.
 *   2) Row Level Security en PostgreSQL: incluso si quitas el global scope
 *      con `withoutGlobalScopes()`, la base bloquea filas de otros tenants
 *      cuando `app.current_tenant` está seteado.
 *
 * Los tests del nivel 2 sólo corren contra pgsql (skip otherwise).
 */

it('TenantScope filters services by current tenant', function () {
    $a = createDemoTenant();
    actingAsTenant($a['tenant']);
    $serviceA = Service::query()->forTenant($a['tenant']->id)->first();

    $b = createDemoTenant();
    actingAsTenant($b['tenant']);

    // Sin tocar withoutGlobalScopes, NO debe ver el servicio de A
    $found = Service::query()->find($serviceA->id);
    expect($found)->toBeNull();

    // Pero la query global ve TODOS los servicios (uno por tenant)
    expect(Service::query()->withoutGlobalScopes()->count())
        ->toBeGreaterThanOrEqual(2);
});

it('RLS blocks cross-tenant reads even without global scope (Postgres only)', function () {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('RLS sólo aplica en PostgreSQL');
    }

    $a = createDemoTenant();
    $serviceA = $a['service'];

    $b = createDemoTenant();

    // Activar el contexto del tenant B en la conexión
    DB::statement("SET LOCAL app.current_tenant = '{$b['tenant']->id}'");

    // Quitamos el global scope: la única defensa restante es RLS
    $found = Service::query()
        ->withoutGlobalScope(TenantScope::class)
        ->where('id', $serviceA->id)
        ->first();

    expect($found)->toBeNull('RLS debió bloquear la lectura del servicio del tenant A');
});

it('RLS blocks cross-tenant writes (Postgres only)', function () {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('RLS sólo aplica en PostgreSQL');
    }

    $a = createDemoTenant();
    $serviceA = $a['service'];

    $b = createDemoTenant();
    DB::statement("SET LOCAL app.current_tenant = '{$b['tenant']->id}'");

    // Intento "vandalizar" el servicio del tenant A — RLS WITH CHECK
    // hace que el UPDATE no afecte ninguna fila.
    $affected = Service::query()
        ->withoutGlobalScope(TenantScope::class)
        ->where('id', $serviceA->id)
        ->update(['name' => 'pwned']);

    expect($affected)->toBe(0);

    // El nombre original sigue intacto
    $original = Tenant::query()->withoutGlobalScopes()
        ->find($a['tenant']->id)
        ->services()->first();
    expect($original->name)->not->toBe('pwned');
});

<?php

declare(strict_types=1);

use App\Domain\Catalog\Models\Service;
use App\Domain\Identity\Models\User;
use App\Domain\Scheduling\Models\BusinessHour;
use App\Domain\Staff\Models\Barber;
use App\Domain\Staff\Models\BarberShift;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\CurrentTenant;
use App\Domain\Tenancy\Models\Tenant;
use App\Infrastructure\CircuitBreaker\CircuitBreaker;
use App\Infrastructure\CircuitBreaker\CircuitState;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class)->in('Feature', 'Unit');

/**
 * Fake CircuitBreaker que ejecuta la operación sin Redis.
 * Sustituye al RedisCircuitBreaker para que los tests no requieran Redis.
 */
final class PassthroughCircuitBreaker implements CircuitBreaker
{
    public function call(string $integration, callable $operation, ?string $scope = null): mixed
    {
        return $operation();
    }

    public function state(string $integration, ?string $scope = null): CircuitState
    {
        return CircuitState::Closed;
    }

    public function forceOpen(string $integration, ?string $scope = null): void {}

    public function forceClose(string $integration, ?string $scope = null): void {}
}

beforeEach(function () {
    app()->instance(CircuitBreaker::class, new PassthroughCircuitBreaker());
});

/** Establece el tenant actual sin pasar por el middleware HTTP. */
function actingAsTenant(Tenant $tenant): Tenant
{
    app(CurrentTenant::class)->set($tenant);

    return $tenant;
}

/**
 * Crea un Plan + Tenant funcional con horario semanal abierto Mar-Sáb 10-19,
 * un barbero con turno y un servicio. Ideal para tests de scheduling/booking.
 *
 * @return array{tenant:Tenant,plan:Plan,barber:Barber,service:Service,admin:User}
 */
function createDemoTenant(array $planFeatures = ['marketing_retention', 'pos_inventory']): array
{
    $plan = Plan::create([
        'code'        => 'test-plan-' . Str::random(6),
        'name'        => 'Plan Test',
        'description' => 'Plan para suite Pest',
        'price_cents' => 0,
        'currency'    => 'MXN',
        'features'    => $planFeatures,
        'max_barbers' => 10,
        'sort_order'  => 1,
        'is_active'   => true,
    ]);

    $tenant = Tenant::create([
        'slug'        => 'demo-' . Str::random(6),
        'name'        => 'Barbería Test',
        'owner_email' => 'admin@test.local',
        'plan_id'     => $plan->id,
        'plan_status' => 'active',
        'timezone'    => 'America/Mexico_City',
        'phone'       => '+52 55 0000 0000',
        'settings'    => ['deposit_pct' => 30, 'currency' => 'MXN'],
    ]);

    actingAsTenant($tenant);

    $admin = User::create([
        'tenant_id' => $tenant->id,
        'name'      => 'Admin Test',
        'email'     => 'admin-' . Str::random(6) . '@test.local',
        'phone'     => '+5215555550000',
        'role'      => User::ROLE_ADMIN,
        'password'  => bcrypt('password'),
    ]);

    foreach ([0, 1] as $closedDay) {
        BusinessHour::create([
            'tenant_id' => $tenant->id, 'weekday' => $closedDay,
            'open_time' => '10:00', 'close_time' => '18:00', 'is_closed' => true,
        ]);
    }
    foreach ([2, 3, 4, 5, 6] as $openDay) {
        BusinessHour::create([
            'tenant_id' => $tenant->id, 'weekday' => $openDay,
            'open_time' => '10:00', 'close_time' => '19:00', 'is_closed' => false,
        ]);
    }

    $barber = Barber::create([
        'tenant_id'            => $tenant->id,
        'name'                 => 'Barbero Test',
        'email'                => 'barbero-' . Str::random(6) . '@test.local',
        'phone'                => '+5215555550001',
        'specialties'          => ['fade'],
        'default_slot_minutes' => 30,
        'commission_pct'       => 50,
        'is_active'            => true,
        'display_order'        => 0,
        'bio'                  => 'Barbero demo.',
    ]);

    foreach ([2, 3, 4, 5, 6] as $weekday) {
        BarberShift::create([
            'tenant_id'  => $tenant->id,
            'barber_id'  => $barber->id,
            'weekday'    => $weekday,
            'start_time' => '10:00',
            'end_time'   => '19:00',
        ]);
    }

    $service = Service::create([
        'tenant_id'        => $tenant->id,
        'name'             => 'Corte Test',
        'description'      => 'Corte de prueba.',
        'duration_minutes' => 60,
        'price_cents'      => 30000,
        'currency'         => 'MXN',
        'is_active'        => true,
        'display_order'    => 0,
    ]);

    $barber->services()->sync([
        $service->id => ['tenant_id' => $tenant->id],
    ]);

    return compact('tenant', 'plan', 'barber', 'service', 'admin');
}

/**
 * Devuelve una fecha futura que cae en martes (weekday 2) a las 11:00 local.
 * Útil para reservar slots dentro del horario de createDemoTenant().
 */
function nextOpenSlot(Tenant $tenant): \Carbon\CarbonImmutable
{
    $cursor = \Carbon\CarbonImmutable::now($tenant->timezone)->addDays(7)->setTime(11, 0);
    while ($cursor->dayOfWeek !== 2) {
        $cursor = $cursor->addDay();
    }

    return $cursor;
}

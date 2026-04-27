<?php

declare(strict_types=1);

use App\Domain\Identity\Models\User;
use App\Domain\Marketing\Services\RetentionScan;

it('lista clientes inactivos por más de N días o sin visita registrada', function () {
    $demo = createDemoTenant();
    $tenantId = $demo['tenant']->id;

    User::create([
        'tenant_id' => $tenantId, 'name' => 'Activo', 'email' => 'activo@test.local',
        'phone' => '+5215510000001', 'role' => User::ROLE_CLIENT, 'password' => bcrypt('x'),
        'last_visit_at' => now()->subDays(5),
    ]);

    User::create([
        'tenant_id' => $tenantId, 'name' => 'Hace 60 días', 'email' => 'lejos@test.local',
        'phone' => '+5215510000002', 'role' => User::ROLE_CLIENT, 'password' => bcrypt('x'),
        'last_visit_at' => now()->subDays(60),
    ]);

    User::create([
        'tenant_id' => $tenantId, 'name' => 'Nunca volvió', 'email' => 'nunca@test.local',
        'phone' => '+5215510000003', 'role' => User::ROLE_CLIENT, 'password' => bcrypt('x'),
        'last_visit_at' => null,
    ]);

    $inactive = app(RetentionScan::class)->inactiveClients($tenantId, 30);

    expect($inactive)->toHaveCount(2)
        ->and($inactive->pluck('email')->all())
        ->toEqualCanonicalizing(['lejos@test.local', 'nunca@test.local']);
});

it('no devuelve clientes de otros tenants', function () {
    $a = createDemoTenant();
    $b = createDemoTenant();

    User::create([
        'tenant_id' => $a['tenant']->id, 'name' => 'A inactivo',
        'email' => 'a-inactive@test.local', 'phone' => '+5215510001001',
        'role' => User::ROLE_CLIENT, 'password' => bcrypt('x'),
        'last_visit_at' => now()->subDays(90),
    ]);
    User::create([
        'tenant_id' => $b['tenant']->id, 'name' => 'B inactivo',
        'email' => 'b-inactive@test.local', 'phone' => '+5215510002002',
        'role' => User::ROLE_CLIENT, 'password' => bcrypt('x'),
        'last_visit_at' => now()->subDays(90),
    ]);

    $inactiveA = app(RetentionScan::class)->inactiveClients($a['tenant']->id, 30);

    expect($inactiveA->pluck('email')->all())->toContain('a-inactive@test.local')
        ->and($inactiveA->pluck('email')->all())->not->toContain('b-inactive@test.local');
});

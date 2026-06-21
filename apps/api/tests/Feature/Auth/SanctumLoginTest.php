<?php

declare(strict_types=1);

use Database\Seeders\PlanSeeder;

it('rechaza login con credenciales inválidas', function () {
    $this->seed(PlanSeeder::class);
    createDemoTenant();

    $this->postJson('/api/auth/login', [
        'email'    => 'admin-noexiste@test.local',
        'password' => 'whatever',
    ])->assertStatus(422);
});

it('emite un token Sanctum y devuelve user + tenant', function () {
    $this->seed(PlanSeeder::class);
    $demo = createDemoTenant();
    $admin = $demo['admin'];

    $response = $this->postJson('/api/auth/login', [
        'email'    => $admin->email,
        'password' => 'password',
    ]);

    $response->assertOk()
        ->assertJsonStructure([
            'token',
            'user'   => ['id', 'name', 'email', 'role'],
            'tenant' => ['id', 'slug', 'name'],
        ])
        ->assertJsonPath('user.email', $admin->email)
        ->assertJsonPath('tenant.id', $demo['tenant']->id);

    expect($response->json('token'))->toBeString()->not->toBeEmpty();
});

it('protege /api/admin/dashboard sin token', function () {
    $this->getJson('/api/admin/dashboard')
        ->assertStatus(401);
});

it('permite acceso a /api/admin/dashboard con token Sanctum y resuelve tenant del usuario', function () {
    $this->seed(PlanSeeder::class);
    $demo = createDemoTenant();

    $token = $demo['admin']->createToken('test-portal', ['admin:*'])->plainTextToken;

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/admin/dashboard')
        ->assertOk();
});

it('un token de un tenant no puede ver datos de otro tenant', function () {
    $this->seed(PlanSeeder::class);
    $a = createDemoTenant();
    $b = createDemoTenant();

    $tokenA = $a['admin']->createToken('a', ['admin:*'])->plainTextToken;

    // Aunque el atacante mande el header X-Tenant del tenant B,
    // ResolveTenant debe usar el tenant del token (A) y NO el header.
    $response = $this->withHeader('Authorization', "Bearer {$tokenA}")
        ->withHeader('X-Tenant', $b['tenant']->slug)
        ->getJson('/api/admin/staff');

    $response->assertOk();
    // Los barberos devueltos deben pertenecer al tenant del token, no al del header.
    $emails = collect($response->json('data') ?? $response->json())
        ->pluck('email')
        ->all();
    expect($emails)->toContain($a['barber']->email)
        ->and($emails)->not->toContain($b['barber']->email);
});

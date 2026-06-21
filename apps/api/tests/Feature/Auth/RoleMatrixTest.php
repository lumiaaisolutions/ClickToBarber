<?php

declare(strict_types=1);

use App\Domain\Identity\Models\User;
use Database\Seeders\PlanSeeder;

beforeEach(function () {
    $this->seed(PlanSeeder::class);
});

/**
 * Matriz de roles: para cada rol del portal, qué endpoints de escritura
 * debería poder ejecutar y cuáles devuelven 403.
 *
 * Las acciones de escritura usan middleware('role:admin,manager'), así que
 * receptionist y barber siempre deben tener 403 en esos endpoints.
 */
$writeEndpoints = [
    ['POST',   '/api/admin/staff',                           ['admin', 'manager']],
    ['POST',   '/api/admin/catalog/services',                ['admin', 'manager']],
];

foreach ($writeEndpoints as [$method, $url, $allowed]) {
    foreach ([User::ROLE_ADMIN, User::ROLE_MANAGER, User::ROLE_RECEPTIONIST, User::ROLE_BARBER] as $role) {
        $expected = in_array(str_replace('User::ROLE_', '', strtoupper($role)), array_map('strtoupper', $allowed), true)
            ? 'allowed' : 'forbidden';

        it("{$method} {$url} for {$role} → {$expected}", function () use ($method, $url, $role, $allowed) {
            $demo = createDemoTenant();
            $user = User::create([
                'tenant_id' => $demo['tenant']->id,
                'name'      => ucfirst($role),
                'email'     => $role . '-' . uniqid() . '@test.local',
                'role'      => $role,
                'password'  => bcrypt('x'),
            ]);

            $headers = ['Authorization' => 'Bearer ' . $user->createToken('test')->plainTextToken];

            // Datos vacíos → si pasa la guardia de rol, fallará por validation (422),
            // si no pasa → 403. Eso nos basta para distinguir.
            $response = $this->json($method, $url, [], $headers);

            if (in_array($role, $allowed, true)) {
                expect($response->status())->not->toBe(403,
                    "Esperaba que {$role} pudiera entrar al endpoint, got 403");
            } else {
                $response->assertStatus(403);
            }
        });
    }
}

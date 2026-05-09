<?php

declare(strict_types=1);

use App\Domain\Tenancy\Models\TenantDomain;

beforeEach(function () {
    $this->demo = createDemoTenant();
    $this->headers = ['Authorization' => 'Bearer ' . $this->demo['admin']->createToken('test')->plainTextToken];
});

it('crea un dominio en estado pending y devuelve instrucciones DNS', function () {
    $r = $this->postJson('/api/admin/domains', ['host' => 'reservas.test-barberia.com'], $this->headers);

    $r->assertCreated()
      ->assertJsonStructure([
          'id', 'host',
          'verification' => ['record_name', 'record_type', 'record_value'],
      ]);

    expect($r->json('verification.record_value'))->toStartWith('lumia-');

    $domain = TenantDomain::query()->where('host', 'reservas.test-barberia.com')->first();
    expect($domain)->not->toBeNull()
        ->and($domain->verified_at)->toBeNull();
});

it('rechaza host duplicado con 409', function () {
    $this->postJson('/api/admin/domains', ['host' => 'one.example.com'], $this->headers)->assertCreated();
    $this->postJson('/api/admin/domains', ['host' => 'one.example.com'], $this->headers)
        ->assertStatus(409)
        ->assertJson(['error' => 'host_taken']);
});

it('verify con TXT no presente responde 422', function () {
    $r = $this->postJson('/api/admin/domains', ['host' => 'noverify.invalid.example'], $this->headers);
    $id = $r->json('id');

    $verify = $this->postJson("/api/admin/domains/{$id}/verify", [], $this->headers);
    $verify->assertStatus(422)->assertJson(['error' => 'txt_not_found']);
});

it('marcar primario falla si no está verificado', function () {
    $r = $this->postJson('/api/admin/domains', ['host' => 'np.example.com'], $this->headers);
    $id = $r->json('id');

    $this->postJson("/api/admin/domains/{$id}/primary", [], $this->headers)
        ->assertStatus(422)->assertJson(['error' => 'not_verified']);
});

it('marcar primario funciona cuando ya está verificado y resetea otros primarios', function () {
    $a = $this->postJson('/api/admin/domains', ['host' => 'a.example.com'], $this->headers)->json('id');
    $b = $this->postJson('/api/admin/domains', ['host' => 'b.example.com'], $this->headers)->json('id');

    TenantDomain::find($a)->forceFill(['verified_at' => now(), 'is_primary' => true])->save();
    TenantDomain::find($b)->forceFill(['verified_at' => now()])->save();

    $this->postJson("/api/admin/domains/{$b}/primary", [], $this->headers)->assertOk();

    expect(TenantDomain::find($a)->is_primary)->toBeFalse()
        ->and(TenantDomain::find($b)->is_primary)->toBeTrue();
});

it('borrar dominio quita la fila e invalida cache', function () {
    $r = $this->postJson('/api/admin/domains', ['host' => 'del.example.com'], $this->headers);
    $id = $r->json('id');

    $this->deleteJson("/api/admin/domains/{$id}", [], $this->headers)->assertOk();

    expect(TenantDomain::find($id))->toBeNull();
});

it('rol distinto a admin/manager no puede crear', function () {
    $barber = \App\Domain\Identity\Models\User::create([
        'tenant_id' => $this->demo['tenant']->id,
        'name' => 'Barber', 'email' => 'b-' . uniqid() . '@x.com',
        'role' => 'barber', 'password' => bcrypt('x'),
    ]);
    $hh = ['Authorization' => 'Bearer ' . $barber->createToken('t')->plainTextToken];

    $this->postJson('/api/admin/domains', ['host' => 'forbidden.example.com'], $hh)
        ->assertStatus(403);
});

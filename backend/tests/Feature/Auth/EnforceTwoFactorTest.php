<?php

declare(strict_types=1);

use App\Http\Common\Middleware\EnforceTwoFactor;
use Illuminate\Http\Request;

beforeEach(function () {
    $this->demo = createDemoTenant();
});

it('deja pasar si el tenant no requiere 2FA', function () {
    $this->demo['tenant']->forceFill(['security' => null])->save();

    $headers = ['Authorization' => 'Bearer ' . $this->demo['admin']->createToken('test')->plainTextToken];
    $this->getJson('/api/auth/me', $headers)->assertOk();
});

it('bloquea con 403 si el tenant requiere 2FA y el user no lo tiene', function () {
    $this->demo['tenant']->forceFill(['security' => ['require_2fa' => true]])->save();

    $token = $this->demo['admin']->createToken('test')->plainTextToken;
    $headers = ['Authorization' => 'Bearer ' . $token];

    // Una ruta cualquiera del portal admin que no esté exenta.
    $r = $this->getJson('/api/admin/dashboard', $headers);
    $r->assertStatus(403)
      ->assertJson(['error' => 'twofa_required_by_tenant']);
});

it('deja pasar incluso con require_2fa si el user ya tiene 2FA confirmado', function () {
    $this->demo['tenant']->forceFill(['security' => ['require_2fa' => true]])->save();
    $this->demo['admin']->forceFill(['two_factor_confirmed_at' => now()])->save();

    $headers = ['Authorization' => 'Bearer ' . $this->demo['admin']->createToken('test')->plainTextToken];
    $this->getJson('/api/admin/dashboard', $headers)->assertOk();
});

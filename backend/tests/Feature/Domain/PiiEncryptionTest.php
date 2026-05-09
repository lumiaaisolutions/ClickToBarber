<?php

declare(strict_types=1);

use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;

it('encrypts user phone at rest and exposes plaintext via cast', function () {
    $demo = createDemoTenant();
    $client = User::create([
        'tenant_id' => $demo['tenant']->id,
        'name'      => 'Cliente PII',
        'email'     => 'pii-' . uniqid() . '@test.local',
        'phone'     => '+5215511112222',
        'role'      => User::ROLE_CLIENT,
        'password'  => bcrypt('x'),
    ]);

    // El modelo descifra: lectura normal devuelve plaintext.
    expect($client->phone)->toBe('+5215511112222');

    // Pero la columna en la base contiene el ciphertext (no contiene el dígito)
    $raw = DB::table('users')->where('id', $client->id)->value('phone');
    expect($raw)->not->toContain('5511112222');
    expect(strlen((string) $raw))->toBeGreaterThan(40, 'Ciphertext debe ser visiblemente más largo que el plain');
});

it('keeps phone_hash in sync for indexable lookup', function () {
    $demo = createDemoTenant();
    $phone = '+52 55 1234 5678';

    $u = User::create([
        'tenant_id' => $demo['tenant']->id,
        'name'      => 'Hash User',
        'email'     => 'hash-' . uniqid() . '@test.local',
        'phone'     => $phone,
        'role'      => User::ROLE_CLIENT,
        'password'  => bcrypt('x'),
    ]);

    expect($u->phone_hash)->toBe(hash('sha256', '+525512345678'));

    // findByPhone normaliza espacios y encuentra el registro
    $found = User::findByPhone($demo['tenant']->id, '+52-55-1234-5678');
    expect($found?->id)->toBe($u->id);
});

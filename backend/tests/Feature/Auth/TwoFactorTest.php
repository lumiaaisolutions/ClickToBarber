<?php

declare(strict_types=1);

use App\Domain\Identity\Models\User;
use App\Domain\Identity\Services\TotpService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

beforeEach(function () {
    $this->demo = createDemoTenant();
    $this->admin = $this->demo['admin'];
    $this->totp = app(TotpService::class);
});

function authHeader(User $u): array
{
    return ['Authorization' => 'Bearer ' . $u->createToken('test')->plainTextToken];
}

it('genera secret + recovery codes en setup y persiste cifrado', function () {
    $r = $this->postJson('/api/admin/security/2fa/setup', [], authHeader($this->admin));
    $r->assertOk()
      ->assertJsonStructure(['secret', 'otpauth_uri', 'recovery_codes']);

    $secret = $r->json('secret');
    expect($secret)->toMatch('/^[A-Z2-7]+$/'); // base32

    $this->admin->refresh();
    expect($this->admin->two_factor_confirmed_at)->toBeNull()
        ->and(Crypt::decryptString($this->admin->two_factor_secret))->toBe($secret);

    expect($r->json('recovery_codes'))->toHaveCount(8);
});

it('confirma 2FA con código TOTP válido y registra audit log', function () {
    $setup = $this->postJson('/api/admin/security/2fa/setup', [], authHeader($this->admin));
    $secret = $setup->json('secret');

    $code = computeTotpForTest($secret);

    $this->postJson('/api/admin/security/2fa/confirm', ['code' => $code], authHeader($this->admin))
        ->assertOk();

    $this->admin->refresh();
    expect($this->admin->two_factor_confirmed_at)->not->toBeNull();

    $audit = \App\Domain\Audit\Models\AuditLog::query()
        ->where('action', '2fa.enabled')
        ->where('actor_user_id', $this->admin->id)
        ->first();
    expect($audit)->not->toBeNull();
});

it('rechaza confirm con código TOTP inválido', function () {
    $this->postJson('/api/admin/security/2fa/setup', [], authHeader($this->admin));
    $this->postJson('/api/admin/security/2fa/confirm', ['code' => '000000'], authHeader($this->admin))
        ->assertStatus(422)
        ->assertJson(['error' => 'invalid_code']);
});

it('login con 2FA activo devuelve requires_2fa y no emite Sanctum directo', function () {
    enableTwoFactor($this->admin);

    $r = $this->postJson('/api/auth/login', [
        'email'    => $this->admin->email,
        'password' => 'password',
    ]);

    $r->assertOk()->assertJson(['requires_2fa' => true])
      ->assertJsonStructure(['login_token']);
    expect($r->json('token'))->toBeNull(); // el Sanctum NO viene aquí
});

it('verify 2FA con TOTP correcto emite Sanctum y consume el login_token', function () {
    enableTwoFactor($this->admin);

    $login = $this->postJson('/api/auth/login', [
        'email' => $this->admin->email, 'password' => 'password',
    ]);
    $loginToken = $login->json('login_token');

    $secret = Crypt::decryptString($this->admin->two_factor_secret);
    $code = computeTotpForTest($secret);

    $r = $this->postJson('/api/auth/2fa/verify', [
        'login_token' => $loginToken,
        'code'        => $code,
    ]);

    $r->assertOk()->assertJsonStructure(['token', 'user', 'tenant']);
    expect($r->json('token'))->toBeString();

    // El login_token YA NO sirve (single-use)
    $this->postJson('/api/auth/2fa/verify', [
        'login_token' => $loginToken,
        'code'        => $code,
    ])->assertStatus(410);
});

it('verify con recovery code lo consume (no se puede reusar)', function () {
    enableTwoFactor($this->admin);

    $codes = json_decode(Crypt::decryptString($this->admin->two_factor_recovery_codes), true);
    $firstCode = $codes[0];

    $loginToken1 = $this->postJson('/api/auth/login', [
        'email' => $this->admin->email, 'password' => 'password',
    ])->json('login_token');

    $this->postJson('/api/auth/2fa/verify', [
        'login_token' => $loginToken1, 'code' => $firstCode,
    ])->assertOk();

    $this->admin->refresh();
    $remaining = json_decode(Crypt::decryptString($this->admin->two_factor_recovery_codes), true);
    expect($remaining)->toHaveCount(7)
        ->and($remaining)->not->toContain($firstCode);

    // Segundo intento con el mismo código → fail
    $loginToken2 = $this->postJson('/api/auth/login', [
        'email' => $this->admin->email, 'password' => 'password',
    ])->json('login_token');
    $this->postJson('/api/auth/2fa/verify', [
        'login_token' => $loginToken2, 'code' => $firstCode,
    ])->assertStatus(422);
});

it('disable requiere password correcto', function () {
    enableTwoFactor($this->admin);

    $this->postJson('/api/admin/security/2fa/disable', ['password' => 'wrong'], authHeader($this->admin))
        ->assertStatus(422);

    $this->admin->refresh();
    expect($this->admin->two_factor_confirmed_at)->not->toBeNull();

    $this->postJson('/api/admin/security/2fa/disable', ['password' => 'password'], authHeader($this->admin))
        ->assertOk();

    $this->admin->refresh();
    expect($this->admin->two_factor_confirmed_at)->toBeNull()
        ->and($this->admin->two_factor_secret)->toBeNull();
});

// ---- helpers ----

function computeTotpForTest(string $secret): string
{
    $reflect = new ReflectionClass(TotpService::class);
    $method = $reflect->getMethod('computeOtp');
    $method->setAccessible(true);

    return $method->invoke(app(TotpService::class), $secret, (int) floor(time() / 30));
}

function enableTwoFactor(User $user): void
{
    $totp = app(TotpService::class);
    $secret = $totp->generateSecret();
    $codes = $totp->generateRecoveryCodes();

    $user->forceFill([
        'two_factor_secret'         => Crypt::encryptString($secret),
        'two_factor_recovery_codes' => Crypt::encryptString(json_encode($codes)),
        'two_factor_confirmed_at'   => now(),
    ])->save();
}

<?php

declare(strict_types=1);

use App\Domain\Growth\Models\Referral;
use App\Domain\Growth\Services\IssueReferral;
use App\Domain\Identity\Models\User;

beforeEach(function () {
    $this->demo = createDemoTenant();
    $this->referrer = User::create([
        'tenant_id' => $this->demo['tenant']->id,
        'name'      => 'Cliente referidor',
        'email'     => 'ref-' . uniqid() . '@test.local',
        'role'      => User::ROLE_CLIENT,
        'password'  => bcrypt('x'),
    ]);
});

it('emite código único formato BARB-XXXX', function () {
    $referral = app(IssueReferral::class)->execute($this->referrer);

    expect($referral->code)->toMatch('/^[A-Z]+\-[A-Z0-9]{4}$/')
        ->and($referral->status)->toBe(Referral::STATUS_PENDING)
        ->and($referral->expires_at?->isFuture())->toBeTrue();
});

it('reusa el referral pending existente para mismo (referrer, referred_email)', function () {
    $email = 'amigo@test.local';

    $first = app(IssueReferral::class)->execute($this->referrer, $email);
    $second = app(IssueReferral::class)->execute($this->referrer, $email);

    expect($first->id)->toBe($second->id);
});

it('rechaza emitir referral para un user que no es ROLE_CLIENT', function () {
    expect(fn () => app(IssueReferral::class)->execute($this->demo['admin']))
        ->toThrow(InvalidArgumentException::class);
});

it('endpoint admin POST /api/admin/referrals emite y devuelve share_url', function () {
    $headers = ['Authorization' => 'Bearer ' . $this->demo['admin']->createToken('test')->plainTextToken];

    $r = $this->postJson('/api/admin/referrals', [
        'referrer_user_id' => $this->referrer->id,
        'referred_email'   => 'nuevo@friend.test',
        'expires_in_days'  => 30,
    ], $headers);

    $r->assertCreated()
      ->assertJsonStructure(['code', 'expires_at', 'share_url']);

    expect($r->json('share_url'))->toContain('?ref=' . $r->json('code'));
});

it('listado admin separa pending / signed_up / completed', function () {
    $issuer = app(IssueReferral::class);
    $r1 = $issuer->execute($this->referrer, 'a@x.com');
    $r2 = $issuer->execute($this->referrer, 'b@x.com');
    $r2->forceFill(['status' => Referral::STATUS_SIGNED_UP])->save();

    $r3 = $issuer->execute($this->referrer, 'c@x.com');
    $r3->forceFill(['status' => Referral::STATUS_COMPLETED])->save();

    $headers = ['Authorization' => 'Bearer ' . $this->demo['admin']->createToken('test')->plainTextToken];
    $r = $this->getJson('/api/admin/referrals', $headers);

    $r->assertOk();
    expect($r->json('kpis.pending'))->toBe(1)
        ->and($r->json('kpis.signed_up'))->toBe(1)
        ->and($r->json('kpis.completed'))->toBe(1);
});

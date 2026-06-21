<?php

declare(strict_types=1);

use App\Domain\Appointments\DTOs\BookAppointmentInput;
use App\Domain\Appointments\Services\BookAppointment;
use App\Domain\Memberships\Models\ClientMembership;
use App\Domain\Memberships\Models\Membership;
use App\Domain\Memberships\Models\GiftCard;

beforeEach(function () {
    $this->demo = createDemoTenant();
    $this->plan = Membership::create([
        'tenant_id'                   => $this->demo['tenant']->id,
        'name'                        => 'Plan Test',
        'price_cents'                 => 39900,
        'currency'                    => 'MXN',
        'included_services_per_month' => 2,
        'eligible_service_ids'        => null,
        'is_active'                   => true,
    ]);
});

it('cita reservada por cliente con membresía activa cobra $0 deposit', function () {
    $client = \App\Domain\Identity\Models\User::create([
        'tenant_id' => $this->demo['tenant']->id,
        'name' => 'Membre', 'email' => 'm-' . uniqid() . '@x.com',
        'phone' => '+5215588881111', 'role' => 'client', 'password' => bcrypt('x'),
    ]);
    ClientMembership::create([
        'tenant_id'                 => $this->demo['tenant']->id,
        'user_id'                   => $client->id,
        'membership_id'             => $this->plan->id,
        'services_used_this_period' => 0,
        'current_period_starts_on'  => today()->subDays(5),
        'current_period_ends_on'    => today()->addDays(25),
        'status'                    => 'active',
    ]);

    $appt = app(BookAppointment::class)->execute(new BookAppointmentInput(
        tenantId:    $this->demo['tenant']->id,
        barberId:    $this->demo['barber']->id,
        serviceId:   $this->demo['service']->id,
        clientName:  $client->name,
        clientEmail: $client->email,
        clientPhone: $client->phone,
        startsAt:    nextOpenSlot($this->demo['tenant'])->toIso8601String(),
    ));

    expect($appt->price_cents)->toBe(0)
        ->and($appt->deposit_cents)->toBe(0)
        ->and($appt->deposit_status)->toBe('covered');

    $cm = ClientMembership::query()->where('user_id', $client->id)->first();
    expect($cm->services_used_this_period)->toBe(1);
});

it('GiftCard::redeem aplica balance parcial y total', function () {
    $gc = GiftCard::create([
        'tenant_id'     => $this->demo['tenant']->id,
        'code'          => GiftCard::newCode(),
        'value_cents'   => 50000,
        'balance_cents' => 50000,
        'currency'      => 'MXN',
        'expires_at'    => now()->addYear(),
    ]);

    expect($gc->isUsable())->toBeTrue();

    $applied = $gc->redeem(20000);
    expect($applied)->toBe(20000)
        ->and($gc->fresh()->balance_cents)->toBe(30000)
        ->and($gc->fresh()->redeemed_at)->toBeNull();

    $applied = $gc->redeem(50000); // intenta más de lo que queda
    expect($applied)->toBe(30000)
        ->and($gc->fresh()->balance_cents)->toBe(0)
        ->and($gc->fresh()->redeemed_at)->not->toBeNull();
    expect($gc->fresh()->isUsable())->toBeFalse();
});

it('GiftCard expirada no es usable', function () {
    $gc = GiftCard::create([
        'tenant_id'     => $this->demo['tenant']->id,
        'code'          => GiftCard::newCode(),
        'value_cents'   => 10000,
        'balance_cents' => 10000,
        'currency'      => 'MXN',
        'expires_at'    => now()->subDay(),
    ]);
    expect($gc->isUsable())->toBeFalse();
});

it('Stripe webhook invoice.paid resetea contador de membership', function () {
    $client = \App\Domain\Identity\Models\User::create([
        'tenant_id' => $this->demo['tenant']->id,
        'name' => 'Renew', 'email' => 'r-' . uniqid() . '@x.com',
        'role' => 'client', 'password' => bcrypt('x'),
    ]);
    $cm = ClientMembership::create([
        'tenant_id'                 => $this->demo['tenant']->id,
        'user_id'                   => $client->id,
        'membership_id'             => $this->plan->id,
        'services_used_this_period' => 2,                       // ya consumió todas
        'current_period_starts_on'  => today()->subMonth(),
        'current_period_ends_on'    => today()->subDay(),       // venció
        'status'                    => 'active',
        'stripe_subscription_id'    => 'sub_membership_test',
    ]);

    $this->postJson('/api/webhooks/stripe', [
        'id'   => 'evt_paid_' . uniqid(),
        'type' => 'invoice.paid',
        'data' => ['object' => ['subscription' => 'sub_membership_test']],
    ])->assertOk();

    $cm->refresh();
    expect($cm->services_used_this_period)->toBe(0)
        ->and($cm->current_period_ends_on->isFuture())->toBeTrue();
});

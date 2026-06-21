<?php

declare(strict_types=1);

use App\Domain\Billing\Models\Subscription;
use App\Domain\Billing\Models\WebhookEvent;
use App\Domain\Identity\Models\User;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\Models\Tenant;
use Database\Seeders\PlanSeeder;

beforeEach(function () {
    $this->seed(PlanSeeder::class);
});

it('provisions a new tenant on checkout.session.completed', function () {
    $payload = [
        'id'   => 'evt_test_' . uniqid(),
        'type' => 'checkout.session.completed',
        'data' => [
            'object' => [
                'id'        => 'cs_test_' . uniqid(),
                'customer'  => 'cus_test',
                'subscription' => 'sub_test_' . uniqid(),
                'customer_details' => ['email' => 'newowner@test.local'],
                'metadata'  => [
                    'plan_slug'     => 'starter',
                    'business_name' => 'Marfil Norte',
                ],
            ],
        ],
    ];

    $response = $this->postJson('/api/webhooks/stripe', $payload);

    $response->assertOk()->assertJson(['ok' => true]);

    $tenant = Tenant::query()->withoutGlobalScopes()->where('slug', 'marfil-norte')->first();
    expect($tenant)->not->toBeNull()
        ->and($tenant->owner_email)->toBe('newowner@test.local');

    $admin = User::query()->withoutGlobalScopes()
        ->where('email', 'newowner@test.local')->first();
    expect($admin)->not->toBeNull()
        ->and($admin->role)->toBe(User::ROLE_ADMIN)
        ->and($admin->first_login_at)->toBeNull();

    expect(Subscription::query()->where('tenant_id', $tenant->id)->exists())->toBeTrue();
});

it('is idempotent: replaying the same event_id does not duplicate', function () {
    $eventId = 'evt_dup_' . uniqid();
    $payload = [
        'id'   => $eventId,
        'type' => 'checkout.session.completed',
        'data' => [
            'object' => [
                'id'               => 'cs_x',
                'customer'         => 'cus_x',
                'subscription'     => 'sub_dup_' . uniqid(),
                'customer_details' => ['email' => 'dup@test.local'],
                'metadata'         => ['plan_slug' => 'starter', 'business_name' => 'Dup'],
            ],
        ],
    ];

    $this->postJson('/api/webhooks/stripe', $payload)->assertOk();
    $this->postJson('/api/webhooks/stripe', $payload)->assertOk();

    expect(WebhookEvent::query()->where('event_id', $eventId)->count())->toBe(1)
        ->and(Tenant::query()->withoutGlobalScopes()->where('slug', 'dup')->count())->toBe(1);
});

it('marks subscription past_due on invoice.payment_failed', function () {
    $plan = Plan::query()->where('code', 'pro')->firstOrFail();
    $tenant = Tenant::query()->create([
        'slug' => 'past-due-test', 'name' => 'Past Due',
        'owner_email' => 'pd@test.local', 'plan_id' => $plan->id,
        'plan_status' => 'active', 'timezone' => 'America/Mexico_City',
    ]);
    $sub = Subscription::query()->create([
        'tenant_id' => $tenant->id, 'plan_id' => $plan->id,
        'status' => Subscription::STATUS_ACTIVE, 'billing_cycle' => 'monthly',
        'stripe_subscription_id' => 'sub_pd_' . uniqid(),
    ]);

    $this->postJson('/api/webhooks/stripe', [
        'id'   => 'evt_pd_' . uniqid(),
        'type' => 'invoice.payment_failed',
        'data' => ['object' => ['subscription' => $sub->stripe_subscription_id]],
    ])->assertOk();

    expect($sub->fresh()->status)->toBe(Subscription::STATUS_PAST_DUE);
});

<?php

declare(strict_types=1);

use App\Domain\Billing\Models\Subscription;
use App\Domain\Subscriptions\Models\Plan;
use Database\Seeders\PlanSeeder;
use Illuminate\Support\Facades\Artisan;

beforeEach(function () {
    $this->seed(PlanSeeder::class);
    $this->demo = createDemoTenant();
});

it('lumia:enforce-dunning con --dry-run no modifica nada', function () {
    $sub = makeSub($this->demo, 'sub_test_pd_' . uniqid(), now()->subDays(10));

    Artisan::call('lumia:enforce-dunning', ['--dry-run' => true]);

    expect($sub->fresh()->status)->toBe(Subscription::STATUS_PAST_DUE);
});

it('lumia:enforce-dunning suspende suscripción past_due > grace days', function () {
    $sub = makeSub($this->demo, 'sub_test_old_' . uniqid(), now()->subDays(10));

    Artisan::call('lumia:enforce-dunning');

    $sub->refresh();
    expect($sub->status)->toBe(Subscription::STATUS_CANCELED)
        ->and($sub->canceled_at)->not->toBeNull();

    $tenant = $this->demo['tenant']->fresh();
    $freePlan = Plan::query()->where('code', 'free')->first();
    expect($tenant->plan_id)->toBe($freePlan->id)
        ->and($tenant->plan_status)->toBe('past_due_downgraded');
});

it('respeta el período de gracia: suscripción reciente no se suspende', function () {
    $sub = makeSub($this->demo, 'sub_test_recent_' . uniqid(), now()->subHours(6));

    Artisan::call('lumia:enforce-dunning');

    expect($sub->fresh()->status)->toBe(Subscription::STATUS_PAST_DUE);
});

function makeSub(array $demo, string $stripeId, \Carbon\CarbonInterface $updatedAt): Subscription
{
    $sub = Subscription::create([
        'tenant_id'              => $demo['tenant']->id,
        'plan_id'                => $demo['plan']->id,
        'status'                 => Subscription::STATUS_PAST_DUE,
        'billing_cycle'          => 'monthly',
        'stripe_subscription_id' => $stripeId,
    ]);
    // updated_at no es mass-assignable; lo seteamos directo sin tocar timestamps automáticos.
    $sub->forceFill(['updated_at' => $updatedAt])->saveQuietly();

    return $sub->fresh();
}

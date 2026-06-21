<?php

declare(strict_types=1);

use App\Domain\Appointments\Events\AppointmentCompleted;
use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use App\Domain\Growth\Models\LoyaltyProgram;
use App\Domain\Growth\Models\LoyaltyReward;
use App\Domain\Growth\Models\LoyaltyVisit;
use App\Domain\Growth\Services\AwardLoyaltyVisit;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    $this->demo = createDemoTenant();

    $this->program = LoyaltyProgram::create([
        'tenant_id'      => $this->demo['tenant']->id,
        'is_active'      => true,
        'every_n_visits' => 3,
        'reward_type'    => 'free_service',
        'reward_value'   => 100,
        'expiry_days'    => 60,
    ]);

    $this->client = User::create([
        'tenant_id' => $this->demo['tenant']->id,
        'name'      => 'Cliente Loyalty',
        'email'     => 'lc-' . uniqid() . '@test.local',
        'role'      => User::ROLE_CLIENT,
        'password'  => bcrypt('x'),
    ]);
});

it('acredita visita cuando AwardLoyaltyVisit corre', function () {
    $appt = makeAppointment($this->demo, $this->client);

    app(AwardLoyaltyVisit::class)->execute($appt);

    expect(LoyaltyVisit::query()->where('appointment_id', $appt->id)->exists())->toBeTrue();
});

it('no acredita dos veces para la misma cita (idempotencia)', function () {
    $appt = makeAppointment($this->demo, $this->client);

    app(AwardLoyaltyVisit::class)->execute($appt);
    app(AwardLoyaltyVisit::class)->execute($appt);

    expect(LoyaltyVisit::query()->where('appointment_id', $appt->id)->count())->toBe(1);
});

it('emite reward al llegar a N visitas (every_n_visits=3)', function () {
    for ($i = 0; $i < 3; $i++) {
        $appt = makeAppointment($this->demo, $this->client);
        app(AwardLoyaltyVisit::class)->execute($appt);
    }

    $rewards = LoyaltyReward::query()
        ->where('user_id', $this->client->id)
        ->get();

    expect($rewards)->toHaveCount(1)
        ->and($rewards->first()->reward_type)->toBe('free_service')
        ->and($rewards->first()->expires_at)->not->toBeNull();
});

it('no emite reward si el programa está inactivo', function () {
    $this->program->update(['is_active' => false]);

    for ($i = 0; $i < 5; $i++) {
        $appt = makeAppointment($this->demo, $this->client);
        app(AwardLoyaltyVisit::class)->execute($appt);
    }

    expect(LoyaltyReward::query()->where('user_id', $this->client->id)->count())->toBe(0);
});

it('listener HandleAppointmentCompleted dispara award al evento', function () {
    $appt = makeAppointment($this->demo, $this->client);

    AppointmentCompleted::dispatch($appt->id, $appt->tenant_id);

    expect(LoyaltyVisit::query()->where('appointment_id', $appt->id)->exists())->toBeTrue();
});

// ---- helpers ----

function makeAppointment(array $demo, User $client): Appointment
{
    static $offset = 0;
    $offset++;

    return Appointment::create([
        'tenant_id'     => $demo['tenant']->id,
        'barber_id'     => $demo['barber']->id,
        'service_id'    => $demo['service']->id,
        'client_id'     => $client->id,
        'starts_at'     => now()->addDays(-$offset)->setTime(11, 0),
        'ends_at'       => now()->addDays(-$offset)->setTime(12, 0),
        'status'        => AppointmentStatus::Completed,
        'price_cents'   => 30000,
        'deposit_cents' => 9000,
        'deposit_status' => 'captured',
        'source'        => 'admin',
    ]);
}

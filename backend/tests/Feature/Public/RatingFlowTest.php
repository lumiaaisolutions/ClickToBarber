<?php

declare(strict_types=1);

use App\Domain\Appointments\Events\AppointmentCompleted;
use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use App\Domain\Engagement\Models\Rating;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    $this->demo = createDemoTenant();
    $this->client = User::create([
        'tenant_id' => $this->demo['tenant']->id,
        'name'      => 'Cliente Rating',
        'email'     => 'rt-' . uniqid() . '@test.local',
        'role'      => User::ROLE_CLIENT,
        'password'  => bcrypt('x'),
    ]);
});

it('emite Rating con token al completarse la cita', function () {
    $appt = ratableAppointment($this->demo, $this->client);

    AppointmentCompleted::dispatch($appt->id, $appt->tenant_id);

    $rating = Rating::query()->where('appointment_id', $appt->id)->first();
    expect($rating)->not->toBeNull()
        ->and($rating->public_token)->toHaveLength(40)
        ->and($rating->stars)->toBe(0)
        ->and($rating->submitted_at)->toBeNull();
});

it('GET público devuelve estado y datos de hidratación', function () {
    $rating = makeRating($this->demo, $this->client);

    $r = $this->getJson('/api/public/ratings/' . $rating->public_token);
    $r->assertOk()
      ->assertJson(['submitted' => false, 'stars' => 0]);
});

it('POST con 5 estrellas marca submitted y is_published=true', function () {
    $rating = makeRating($this->demo, $this->client);

    $this->postJson('/api/public/ratings/' . $rating->public_token, [
        'stars'   => 5,
        'comment' => 'Excelente experiencia',
    ])->assertOk();

    $rating->refresh();
    expect($rating->stars)->toBe(5)
        ->and($rating->is_published)->toBeTrue()
        ->and($rating->submitted_at)->not->toBeNull();
});

it('1-3 estrellas se ocultan del público (is_published=false)', function () {
    $rating = makeRating($this->demo, $this->client);

    $this->postJson('/api/public/ratings/' . $rating->public_token, ['stars' => 2])->assertOk();

    $rating->refresh();
    expect($rating->is_published)->toBeFalse();
});

it('segundo POST con el mismo token retorna 410 (single-use)', function () {
    $rating = makeRating($this->demo, $this->client);

    $this->postJson('/api/public/ratings/' . $rating->public_token, ['stars' => 4])->assertOk();
    $this->postJson('/api/public/ratings/' . $rating->public_token, ['stars' => 5])
        ->assertStatus(410);
});

it('token inválido devuelve 404', function () {
    $this->postJson('/api/public/ratings/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', ['stars' => 5])
        ->assertStatus(404);
});

// ---- helpers ----

function ratableAppointment(array $demo, User $client): Appointment
{
    return Appointment::create([
        'tenant_id'     => $demo['tenant']->id,
        'barber_id'     => $demo['barber']->id,
        'service_id'    => $demo['service']->id,
        'client_id'     => $client->id,
        'starts_at'     => now()->subHour(),
        'ends_at'       => now()->subMinutes(30),
        'status'        => AppointmentStatus::Completed,
        'price_cents'   => 30000,
        'deposit_cents' => 9000,
        'deposit_status' => 'captured',
        'source'        => 'admin',
    ]);
}

function makeRating(array $demo, User $client): Rating
{
    $appt = ratableAppointment($demo, $client);
    return Rating::create([
        'tenant_id'      => $demo['tenant']->id,
        'appointment_id' => $appt->id,
        'user_id'        => $client->id,
        'barber_id'      => $demo['barber']->id,
        'stars'          => 0,
        'public_token'   => Rating::newToken(),
    ]);
}

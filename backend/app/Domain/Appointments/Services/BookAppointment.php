<?php

declare(strict_types=1);

namespace App\Domain\Appointments\Services;

use App\Domain\Appointments\DTOs\BookAppointmentInput;
use App\Domain\Appointments\Events\AppointmentBooked;
use App\Domain\Appointments\Exceptions\SlotAlreadyBooked;
use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\Models\AppointmentStatusHistory;
use App\Domain\Appointments\Repositories\Contracts\AppointmentRepository;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use App\Domain\Catalog\Models\Service;
use App\Domain\Growth\Models\Referral;
use App\Domain\Identity\Models\User;
use App\Domain\Memberships\Models\ClientMembership;
use App\Domain\Notifications\Jobs\AutoCancelUnconfirmedAppointment;
use App\Domain\Notifications\Jobs\SendReminder24h;
use App\Domain\Notifications\Jobs\SendReminder2hWithButtons;
use App\Domain\Staff\Models\Barber;
use App\Domain\Tenancy\Models\Tenant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class BookAppointment
{
    public function __construct(private AppointmentRepository $repository) {}

    public function execute(BookAppointmentInput $input): Appointment
    {
        /** @var array{Appointment, CarbonImmutable} $result */
        $result = DB::transaction(function () use ($input) {
            $tenant  = Tenant::findOrFail($input->tenantId);
            $barber  = Barber::forTenant($tenant->id)->findOrFail($input->barberId);
            $service = Service::forTenant($tenant->id)->findOrFail($input->serviceId);

            $startsAt = CarbonImmutable::parse($input->startsAt, $tenant->timezone);
            $endsAt   = $startsAt->addMinutes($service->duration_minutes);

            if ($this->repository->existsConflict($barber->id, $startsAt, $endsAt)) {
                throw new SlotAlreadyBooked($barber->id, $startsAt->toIso8601String());
            }

            $client = User::firstOrCreate(
                ['email' => strtolower($input->clientEmail)],
                [
                    'tenant_id' => $tenant->id,
                    'name'      => $input->clientName,
                    'phone'     => $input->clientPhone,
                    'role'      => User::ROLE_CLIENT,
                    'password'  => bcrypt(str()->random(32)),
                ]
            );
            if (! $client->phone && $input->clientPhone) {
                $client->update(['phone' => $input->clientPhone]);
            }

            // Si el cliente tiene membresía activa con servicios disponibles
            // y el servicio actual es elegible → cobramos $0 (no deposit).
            $coveredByMembership = $this->isCoveredByMembership($tenant->id, $client->id, $service->id);
            $depositCents = $coveredByMembership
                ? 0
                : (int) round($service->price_cents * ($tenant->depositPercentage() / 100));

            $appointment = new Appointment([
                'tenant_id'      => $tenant->id,
                'barber_id'      => $barber->id,
                'service_id'     => $service->id,
                'client_id'      => $client->id,
                'starts_at'      => $startsAt,
                'ends_at'        => $endsAt,
                'status'         => AppointmentStatus::PendingConfirmation,
                'price_cents'    => $coveredByMembership ? 0 : $service->price_cents,
                'deposit_cents'  => $depositCents,
                'deposit_status' => $coveredByMembership ? 'covered' : 'pending',
                'source'         => 'client_web',
                'notes'          => $input->notes,
            ]);

            $appointment = $this->repository->save($appointment);

            if ($coveredByMembership) {
                $this->consumeMembershipService($tenant->id, $client->id);
            }

            AppointmentStatusHistory::create([
                'tenant_id'      => $tenant->id,
                'appointment_id' => $appointment->id,
                'from_status'    => null,
                'to_status'      => AppointmentStatus::PendingConfirmation->value,
                'actor'          => "user:{$client->id}",
                'context'        => ['source' => 'client_web', 'membership' => $coveredByMembership],
                'created_at'     => now(),
            ]);

            AppointmentBooked::dispatch($appointment->id, $tenant->id);

            // Si la reserva trae código de referido, asociamos al cliente.
            if ($input->referralCode) {
                $referral = Referral::query()
                    ->where('tenant_id', $tenant->id)
                    ->where('code', $input->referralCode)
                    ->where('status', Referral::STATUS_PENDING)
                    ->where(function ($q) { $q->whereNull('expires_at')->orWhere('expires_at', '>', now()); })
                    ->first();
                if ($referral && $referral->referrer_user_id !== $client->id) {
                    $referral->forceFill([
                        'referred_user_id' => $client->id,
                        'status'           => Referral::STATUS_SIGNED_UP,
                        'signed_up_at'     => now(),
                    ])->save();
                }
            }

            return [$appointment, $startsAt];
        });

        [$appointment, $startsAt] = $result;

        // Pipeline anti-no-show: tres jobs programados FUERA de la transacción.
        if (! app()->runningUnitTests()) {
            $reminder24 = $startsAt->subDay();
            if ($reminder24->isFuture()) {
                SendReminder24h::dispatch($appointment->id)->delay($reminder24);
            }
            $reminder2 = $startsAt->subHours(2);
            if ($reminder2->isFuture()) {
                SendReminder2hWithButtons::dispatch($appointment->id)->delay($reminder2);
            }
            $autoCancel = $startsAt->subHour();
            if ($autoCancel->isFuture()) {
                AutoCancelUnconfirmedAppointment::dispatch($appointment->id)->delay($autoCancel);
            }
        }

        return $appointment;
    }

    private function isCoveredByMembership(string $tenantId, int $userId, int $serviceId): bool
    {
        $cm = ClientMembership::query()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->where('current_period_ends_on', '>=', today())
            ->with('membership')
            ->first();

        if (! $cm || ! $cm->membership) return false;
        if (! $cm->hasRemainingServices()) return false;

        $eligible = $cm->membership->eligible_service_ids;
        if ($eligible !== null && ! in_array($serviceId, $eligible, true)) {
            return false;
        }
        return true;
    }

    private function consumeMembershipService(string $tenantId, int $userId): void
    {
        ClientMembership::query()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->where('current_period_ends_on', '>=', today())
            ->increment('services_used_this_period');
    }
}

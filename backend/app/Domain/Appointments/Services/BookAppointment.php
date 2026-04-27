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
use App\Domain\Identity\Models\User;
use App\Domain\Staff\Models\Barber;
use App\Domain\Tenancy\Models\Tenant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class BookAppointment
{
    public function __construct(private AppointmentRepository $repository) {}

    public function execute(BookAppointmentInput $input): Appointment
    {
        return DB::transaction(function () use ($input) {
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

            $depositCents = (int) round($service->price_cents * ($tenant->depositPercentage() / 100));

            $appointment = new Appointment([
                'tenant_id'      => $tenant->id,
                'barber_id'      => $barber->id,
                'service_id'     => $service->id,
                'client_id'      => $client->id,
                'starts_at'      => $startsAt,
                'ends_at'        => $endsAt,
                'status'         => AppointmentStatus::PendingConfirmation,
                'price_cents'    => $service->price_cents,
                'deposit_cents'  => $depositCents,
                'deposit_status' => 'pending',
                'source'         => 'client_web',
                'notes'          => $input->notes,
            ]);

            $appointment = $this->repository->save($appointment);

            AppointmentStatusHistory::create([
                'tenant_id'      => $tenant->id,
                'appointment_id' => $appointment->id,
                'from_status'    => null,
                'to_status'      => AppointmentStatus::PendingConfirmation->value,
                'actor'          => "user:{$client->id}",
                'context'        => ['source' => 'client_web'],
                'created_at'     => now(),
            ]);

            AppointmentBooked::dispatch($appointment->id, $tenant->id);

            return $appointment;
        });
    }
}

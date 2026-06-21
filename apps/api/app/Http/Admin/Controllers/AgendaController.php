<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Appointments\Repositories\Contracts\AppointmentRepository;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Client\Resources\AppointmentResource;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

final class AgendaController
{
    public function __construct(
        private AppointmentRepository $repository,
        private CurrentTenant $current,
    ) {}

    public function __invoke(Request $request)
    {
        $tenant = $this->current->require();
        $tz = $tenant->timezone;
        $from = CarbonImmutable::parse($request->input('from', 'today'), $tz)->startOfDay();
        $to   = CarbonImmutable::parse($request->input('to', 'today +6 days'), $tz)->endOfDay();

        $appointments = $this->repository->forTenantBetween($tenant->id, $from, $to);

        return AppointmentResource::collection($appointments);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Client\Controllers;

use App\Domain\Catalog\Models\Service;
use App\Domain\Scheduling\Services\AvailabilityCalculator;
use App\Domain\Staff\Models\Barber;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

final class AvailabilityController
{
    public function __construct(private AvailabilityCalculator $calculator) {}

    public function __invoke(Request $request)
    {
        $request->validate([
            'barber_id'  => ['required', 'integer', 'exists:barbers,id'],
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'date'       => ['required', 'date'],
        ]);

        $barber  = Barber::findOrFail($request->integer('barber_id'));
        $service = Service::findOrFail($request->integer('service_id'));
        $date    = CarbonImmutable::parse($request->string('date')->toString(), $barber->tenant->timezone);

        return [
            'date'  => $date->toDateString(),
            'slots' => $this->calculator->slotsFor($barber, $service, $date),
        ];
    }
}

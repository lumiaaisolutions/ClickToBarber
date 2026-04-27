<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Staff\Models\Barber;

final class StaffController
{
    public function __invoke()
    {
        return Barber::with(['shifts', 'services'])
            ->orderBy('display_order')
            ->get()
            ->map(fn (Barber $b) => [
                'id'             => $b->id,
                'name'           => $b->name,
                'email'          => $b->email,
                'phone'          => $b->phone,
                'avatar'         => $b->avatar_url,
                'specialties'    => $b->specialties ?? [],
                'commission_pct' => $b->commission_pct,
                'is_active'      => $b->is_active,
                'shifts'         => $b->shifts->map(fn ($s) => [
                    'weekday' => $s->weekday,
                    'start'   => $s->start_time,
                    'end'     => $s->end_time,
                ]),
                'services_count' => $b->services->count(),
            ]);
    }
}

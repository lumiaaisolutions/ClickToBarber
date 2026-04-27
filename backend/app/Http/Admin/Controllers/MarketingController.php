<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Marketing\Services\RetentionScan;
use App\Domain\Tenancy\CurrentTenant;
use Illuminate\Http\Request;

final class MarketingController
{
    public function __construct(
        private RetentionScan $retention,
        private CurrentTenant $current,
    ) {}

    public function __invoke(Request $request)
    {
        $tenant = $this->current->require();
        $days = (int) $request->input('days', 30);

        $clients = $this->retention->inactiveClients($tenant->id, $days);

        return [
            'days_threshold' => $days,
            'count'          => $clients->count(),
            'clients'        => $clients->map(fn ($c) => [
                'id'           => $c->id,
                'name'         => $c->name,
                'email'        => $c->email,
                'phone'        => $c->phone,
                'last_visit'   => $c->last_visit_at?->toIso8601String(),
                'days_since'   => $c->last_visit_at?->diffInDays(now()) ?? null,
            ]),
        ];
    }
}

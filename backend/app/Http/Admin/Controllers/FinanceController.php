<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Payments\Models\Payment;
use App\Domain\PointOfSale\Models\Ticket;
use App\Domain\Staff\Models\Barber;
use App\Domain\Tenancy\CurrentTenant;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

final class FinanceController
{
    public function __construct(private CurrentTenant $current) {}

    public function __invoke(Request $request)
    {
        $tenant = $this->current->require();
        $tz = $tenant->timezone;
        $from = CarbonImmutable::parse($request->input('from', 'first day of this month'), $tz)->startOfDay();
        $to   = CarbonImmutable::parse($request->input('to', 'last day of this month'), $tz)->endOfDay();

        $payments = Payment::whereBetween('created_at', [$from, $to])
            ->where('status', 'succeeded')
            ->get();

        $byPurpose = $payments->groupBy('purpose')->map->sum('amount_cents');
        $byProvider = $payments->groupBy('provider')->map->sum('amount_cents');

        $tickets = Ticket::with(['barber'])->whereBetween('created_at', [$from, $to])
            ->where('status', 'paid')
            ->get();

        $barbers = Barber::all()->keyBy('id');

        $commissions = $tickets
            ->groupBy('barber_id')
            ->map(function ($items, $barberId) use ($barbers) {
                $barber = $barbers[$barberId] ?? null;
                $totalCents = (int) $items->sum('total_cents');
                return [
                    'barber'         => $barber?->name,
                    'tickets'        => $items->count(),
                    'gross_cents'    => $totalCents,
                    'commission_cents' => (int) round($totalCents * (($barber?->commission_pct ?? 0) / 100)),
                ];
            })->values();

        return [
            'period'      => ['from' => $from->toIso8601String(), 'to' => $to->toIso8601String()],
            'gross_cents' => (int) $payments->sum('amount_cents'),
            'by_purpose'  => $byPurpose,
            'by_provider' => $byProvider,
            'commissions' => $commissions,
        ];
    }
}

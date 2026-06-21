<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\PointOfSale\Models\Ticket;
use App\Domain\Staff\Models\Barber;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Cierre de caja diario por barbero.
 *
 *  GET  /api/admin/cash-close?barber_id=X&date=Y → preview computado.
 *  POST /api/admin/cash-close { barber_id, date, declared_cash_cents } → guarda CashClose.
 */
final class CashCloseController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function preview(Request $request): JsonResponse
    {
        $tenant = $this->current->require();
        $data = $request->validate([
            'barber_id' => ['required', 'integer'],
            'date'      => ['nullable', 'date'],
        ]);
        $date = $data['date'] ?? today()->toDateString();

        $barber = Barber::query()->forTenant($tenant->id)->findOrFail($data['barber_id']);

        $tickets = Ticket::query()
            ->where('tenant_id', $tenant->id)
            ->where('barber_id', $barber->id)
            ->whereDate('closed_at', $date)
            ->whereNotNull('closed_at')
            ->get();

        $byMethod = $tickets->groupBy('payment_method')->map->sum('total_cents');
        $tipsSum = (int) DB::table('tip_splits')
            ->where('tenant_id', $tenant->id)
            ->where('barber_id', $barber->id)
            ->whereDate('earned_on', $date)
            ->sum('amount_cents');

        $gross = (int) $tickets->sum('total_cents');
        $commission = (int) round($gross * (($barber->commission_pct ?? 0) / 100));

        return response()->json([
            'date'              => $date,
            'barber'            => ['id' => $barber->id, 'name' => $barber->name, 'commission_pct' => $barber->commission_pct],
            'tickets_count'     => $tickets->count(),
            'gross_cents'       => $gross,
            'by_method'         => $byMethod,
            'tips_cents'        => $tipsSum,
            'commission_cents'  => $commission,
            'cash_expected_cents' => (int) ($byMethod['cash'] ?? 0),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();

        $data = $request->validate([
            'barber_id'           => ['required', 'integer'],
            'date'                => ['required', 'date'],
            'declared_cash_cents' => ['required', 'integer', 'min:0'],
            'notes'               => ['nullable', 'string', 'max:500'],
        ]);

        $preview = $this->preview($request)->getData(true);

        $variance = $data['declared_cash_cents'] - $preview['cash_expected_cents'];

        $row = DB::table('cash_closes')->updateOrInsert(
            [
                'tenant_id' => $tenant->id,
                'barber_id' => $data['barber_id'],
                'date'      => $data['date'],
            ],
            [
                'gross_cents'         => $preview['gross_cents'],
                'cash_expected_cents' => $preview['cash_expected_cents'],
                'cash_declared_cents' => $data['declared_cash_cents'],
                'variance_cents'      => $variance,
                'commission_cents'    => $preview['commission_cents'],
                'tips_cents'          => $preview['tips_cents'],
                'notes'               => $data['notes'] ?? null,
                'closed_by_user_id'   => $request->user()->id,
                'closed_at'           => now(),
                'created_at'          => now(),
                'updated_at'          => now(),
            ],
        );

        return response()->json([
            'ok'              => true,
            'variance_cents'  => $variance,
            'commission_cents' => $preview['commission_cents'],
        ], 201);
    }

    private function guardWrite(Request $request): void
    {
        $u = $request->user();
        if (! $u || ! $u->canWrite()) {
            abort(response()->json(['error' => 'role_forbidden'], 403));
        }
    }
}

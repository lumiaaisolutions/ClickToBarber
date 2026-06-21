<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Scheduling\Models\BusinessHour;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * GET  /api/admin/business-hours       — devuelve los 7 días (autocompletados si faltan).
 * PUT  /api/admin/business-hours       — guarda los 7 días (replace-all).
 */
final class BusinessHoursController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function index(): JsonResponse
    {
        $tenant = $this->current->require();
        $existing = BusinessHour::query()
            ->where('tenant_id', $tenant->id)
            ->orderBy('weekday')
            ->get()
            ->keyBy('weekday');

        // Garantiza 7 entradas (0..6) — las que falten se rellenan como "cerrado".
        $hours = [];
        for ($w = 0; $w < 7; $w++) {
            $row = $existing->get($w);
            $hours[] = [
                'weekday'    => $w,
                'open_time'  => $row?->open_time ?? '10:00',
                'close_time' => $row?->close_time ?? '19:00',
                'is_closed'  => $row?->is_closed ?? true,
            ];
        }

        return response()->json($hours);
    }

    public function update(Request $request): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();

        $data = $request->validate([
            'hours'                => ['required', 'array', 'size:7'],
            'hours.*.weekday'      => ['required', 'integer', 'min:0', 'max:6'],
            'hours.*.open_time'    => ['required', 'string', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'hours.*.close_time'   => ['required', 'string', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'hours.*.is_closed'    => ['nullable', 'boolean'],
        ]);

        // Replace-all atómico: borra y reescribe.
        DB::transaction(function () use ($tenant, $data) {
            BusinessHour::query()->where('tenant_id', $tenant->id)->delete();
            foreach ($data['hours'] as $h) {
                BusinessHour::create([
                    'tenant_id'  => $tenant->id,
                    'weekday'    => $h['weekday'],
                    'open_time'  => $h['open_time'],
                    'close_time' => $h['close_time'],
                    'is_closed'  => $h['is_closed'] ?? false,
                ]);
            }
        });

        return $this->index();
    }

    private function guardWrite(Request $request): void
    {
        $user = $request->user();
        if (! $user || ! $user->canWrite()) {
            abort(response()->json(['error' => 'role_forbidden'], 403));
        }
    }
}

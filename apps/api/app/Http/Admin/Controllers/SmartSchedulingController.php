<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * GET /api/admin/insights/smart-slots
 * Devuelve por barbero los slots con mayor % de huecos en las últimas 8 semanas
 * para que el admin promueva esos horarios (loyalty / cupones / WhatsApp blast).
 */
final class SmartSchedulingController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function __invoke(): JsonResponse
    {
        $tenant = $this->current->require();
        $since = now()->subWeeks(8)->startOfDay();

        $rows = DB::table('appointments')
            ->where('tenant_id', $tenant->id)
            ->where('starts_at', '>=', $since)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->selectRaw("
                barber_id,
                strftime('%w', starts_at) as weekday,
                strftime('%H', starts_at) as hour,
                COUNT(*) as cnt
            ")
            ->groupBy('barber_id', 'weekday', 'hour')
            ->get();

        // Pivotamos en memoria: por barbero, weekday × hour → count.
        $byBarber = [];
        foreach ($rows as $r) {
            $byBarber[$r->barber_id][$r->weekday . '-' . $r->hour] = (int) $r->cnt;
        }

        // Calculamos el slot menos visto (proxy de "muchos huecos").
        $suggestions = [];
        foreach ($byBarber as $barberId => $cells) {
            $sorted = collect($cells)->sortBy(fn ($v) => $v)->take(3);
            foreach ($sorted as $key => $count) {
                [$weekday, $hour] = explode('-', $key);
                $suggestions[] = [
                    'barber_id'    => (int) $barberId,
                    'weekday'      => (int) $weekday,
                    'hour'         => (int) $hour,
                    'visits_8w'    => (int) $count,
                ];
            }
        }

        return response()->json([
            'period_weeks' => 8,
            'suggestions'  => $suggestions,
        ]);
    }
}

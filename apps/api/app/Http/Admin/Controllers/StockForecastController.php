<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Catalog\Models\Product;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * GET /api/admin/insights/stock-forecast
 * Para cada producto, calcula la velocidad media de salida (sales/día) en
 * los últimos 30 días y proyecta cuándo se acabará el stock actual.
 */
final class StockForecastController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function __invoke(): JsonResponse
    {
        $tenant = $this->current->require();
        $since = now()->subDays(30)->startOfDay();

        $velocities = DB::table('stock_movements')
            ->where('tenant_id', $tenant->id)
            ->where('type', 'sale')
            ->where('created_at', '>=', $since)
            ->selectRaw('product_id, SUM(qty) as total_sold')
            ->groupBy('product_id')
            ->pluck('total_sold', 'product_id');

        $products = Product::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->get(['id', 'name', 'sku', 'stock', 'stock_min']);

        $forecast = $products->map(function (Product $p) use ($velocities) {
            $sold30d = (float) ($velocities[$p->id] ?? 0);
            $perDay  = $sold30d / 30.0;
            $daysToOut = $perDay > 0 ? (int) floor($p->stock / $perDay) : null;

            return [
                'id'                => $p->id,
                'name'              => $p->name,
                'sku'                => $p->sku,
                'stock'             => $p->stock,
                'stock_min'         => $p->stock_min,
                'sold_last_30d'     => (int) $sold30d,
                'per_day_avg'       => round($perDay, 2),
                'days_until_stockout' => $daysToOut,
                'reorder_now'       => $daysToOut !== null && $daysToOut <= 14,
            ];
        })->sortBy('days_until_stockout', SORT_REGULAR, false)->values();

        return response()->json(['forecast' => $forecast]);
    }
}

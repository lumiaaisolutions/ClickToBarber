<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Operations\Models\WalkInQueueEntry;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin operación walk-in:
 *  GET  /api/admin/queue                 → fila completa con estados.
 *  POST /api/admin/queue/{id}/call       → siguiente, marca in_progress.
 *  POST /api/admin/queue/{id}/serve      → terminado, marca served.
 *  POST /api/admin/queue/{id}/abandon    → cliente se fue, marca abandoned.
 */
final class WalkInQueueAdminController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function index(): JsonResponse
    {
        $tenant = $this->current->require();

        $entries = WalkInQueueEntry::query()
            ->where('tenant_id', $tenant->id)
            ->whereDate('arrived_at', today())
            ->orderBy('arrived_at')
            ->get();

        return response()->json($entries->map(fn (WalkInQueueEntry $e) => [
            'id'            => $e->id,
            'client_name'   => $e->client_name,
            'client_phone'  => $e->client_phone,
            'barber_id'     => $e->barber_id,
            'service_id'    => $e->service_id,
            'status'        => $e->status,
            'arrived_at'    => $e->arrived_at?->toIso8601String(),
            'called_at'     => $e->called_at?->toIso8601String(),
            'served_at'     => $e->served_at?->toIso8601String(),
        ]));
    }

    public function call(Request $request, int $id): JsonResponse
    {
        $entry = $this->find($id);
        $entry->forceFill([
            'status'    => WalkInQueueEntry::STATUS_IN_PROGRESS,
            'called_at' => now(),
        ])->save();
        return response()->json(['ok' => true]);
    }

    public function serve(Request $request, int $id): JsonResponse
    {
        $entry = $this->find($id);
        $entry->forceFill([
            'status'    => WalkInQueueEntry::STATUS_SERVED,
            'served_at' => now(),
        ])->save();
        return response()->json(['ok' => true]);
    }

    public function abandon(Request $request, int $id): JsonResponse
    {
        $entry = $this->find($id);
        $entry->forceFill(['status' => WalkInQueueEntry::STATUS_ABANDONED])->save();
        return response()->json(['ok' => true]);
    }

    private function find(int $id): WalkInQueueEntry
    {
        $tenant = $this->current->require();
        return WalkInQueueEntry::query()
            ->where('tenant_id', $tenant->id)
            ->where('id', $id)
            ->firstOrFail();
    }
}

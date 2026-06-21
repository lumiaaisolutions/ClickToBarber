<?php

declare(strict_types=1);

namespace App\Http\Public\Controllers;

use App\Domain\Operations\Models\WalkInQueueEntry;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Walk-in queue público:
 *  GET  /api/public/queue/{slug}            → estado + posición estimada.
 *  POST /api/public/queue/{slug}/join       → cliente se mete a la fila.
 *
 * Sin auth. Cuando el cliente entra el QR físico de la barbería contiene
 * `<frontend>/q/<slug>` que llama a este endpoint y muestra "eres el #4,
 * estimado 35 min".
 */
final class WalkInQueueController extends Controller
{
    public function status(string $slug): JsonResponse
    {
        $tenant = Tenant::query()->withoutGlobalScopes()->where('slug', $slug)->firstOrFail();

        $waiting = WalkInQueueEntry::query()
            ->where('tenant_id', $tenant->id)
            ->where('status', WalkInQueueEntry::STATUS_WAITING)
            ->orderBy('arrived_at')
            ->get(['id', 'client_name', 'arrived_at', 'estimated_minutes']);

        $estimateBase = (int) ($tenant->settings['walk_in_avg_minutes'] ?? 30);
        $estimated = $estimateBase * $waiting->count();

        return response()->json([
            'tenant'          => ['name' => $tenant->name, 'slug' => $tenant->slug],
            'waiting'         => $waiting->count(),
            'queue'           => $waiting->map(fn ($e, $i) => [
                'position' => $i + 1,
                'first_name' => explode(' ', $e->client_name)[0],
                'arrived_at' => $e->arrived_at?->toIso8601String(),
            ])->values(),
            'estimated_minutes' => $estimated,
        ]);
    }

    public function join(Request $request, string $slug): JsonResponse
    {
        $tenant = Tenant::query()->withoutGlobalScopes()->where('slug', $slug)->firstOrFail();

        $data = $request->validate([
            'client_name'  => ['required', 'string', 'max:120'],
            'client_phone' => ['nullable', 'string', 'max:32'],
            'barber_id'    => ['nullable', 'integer'],
            'service_id'   => ['nullable', 'integer'],
        ]);

        $entry = WalkInQueueEntry::create([
            'tenant_id'    => $tenant->id,
            'client_name'  => $data['client_name'],
            'client_phone' => $data['client_phone'] ?? null,
            'barber_id'    => $data['barber_id'] ?? null,
            'service_id'   => $data['service_id'] ?? null,
            'status'       => WalkInQueueEntry::STATUS_WAITING,
            'arrived_at'   => now(),
        ]);

        $position = WalkInQueueEntry::query()
            ->where('tenant_id', $tenant->id)
            ->where('status', WalkInQueueEntry::STATUS_WAITING)
            ->where('arrived_at', '<=', $entry->arrived_at)
            ->count();

        return response()->json([
            'id'        => $entry->id,
            'position'  => $position,
            'estimated_minutes' => $position * (int) ($tenant->settings['walk_in_avg_minutes'] ?? 30),
        ], 201);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Engagement\Models\Rating;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Vista admin de ratings:
 *  GET  /api/admin/ratings                 → lista todos (incluye 1-3★).
 *  POST /api/admin/ratings/{id}/publish    → marca is_published=true.
 *  POST /api/admin/ratings/{id}/unpublish  → marca is_published=false.
 */
final class AdminRatingsController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function index(Request $request): JsonResponse
    {
        $tenant = $this->current->require();
        $stars  = (int) $request->query('stars', 0);

        $q = Rating::query()
            ->where('tenant_id', $tenant->id)
            ->whereNotNull('submitted_at')
            ->with(['user:id,name,email', 'barber:id,name'])
            ->orderByDesc('submitted_at');

        if ($stars >= 1 && $stars <= 5) {
            $q->where('stars', $stars);
        }

        $ratings = $q->limit(200)->get();

        $avg = $ratings->whereNotNull('stars')->avg('stars');
        $stats = [
            'avg'      => $avg !== null ? round($avg, 2) : null,
            'count'    => $ratings->count(),
            'positive' => $ratings->where('stars', '>=', 4)->count(),
            'negative' => $ratings->where('stars', '<=', 3)->count(),
        ];

        return response()->json([
            'stats'   => $stats,
            'ratings' => $ratings->map(fn (Rating $r) => [
                'id'           => $r->id,
                'stars'        => $r->stars,
                'comment'      => $r->comment,
                'is_published' => $r->is_published,
                'client'       => $r->user?->name,
                'barber'       => $r->barber?->name,
                'submitted_at' => $r->submitted_at?->toIso8601String(),
            ]),
        ]);
    }

    public function publish(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);
        $r = $this->find($id);
        $r->forceFill(['is_published' => true])->save();
        return response()->json(['ok' => true]);
    }

    public function unpublish(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);
        $r = $this->find($id);
        $r->forceFill(['is_published' => false])->save();
        return response()->json(['ok' => true]);
    }

    private function find(int $id): Rating
    {
        $tenant = $this->current->require();
        return Rating::query()
            ->where('tenant_id', $tenant->id)
            ->where('id', $id)
            ->firstOrFail();
    }

    private function guardWrite(Request $request): void
    {
        $u = $request->user();
        if (! $u || ! $u->canWrite()) {
            abort(response()->json(['error' => 'role_forbidden'], 403));
        }
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Operations\Models\InAppNotification;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET    /api/admin/notifications        → unread + 20 últimas leídas
 * POST   /api/admin/notifications/read   → marca todas como leídas
 * POST   /api/admin/notifications/{id}/read → marca una como leída
 */
final class InAppNotificationsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $unread = InAppNotification::query()
            ->where('user_id', $userId)
            ->whereNull('read_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        $recent = InAppNotification::query()
            ->where('user_id', $userId)
            ->whereNotNull('read_at')
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        return response()->json([
            'unread_count' => $unread->count(),
            'unread'       => $unread,
            'recent'       => $recent,
        ]);
    }

    public function readAll(Request $request): JsonResponse
    {
        InAppNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
        return response()->json(['ok' => true]);
    }

    public function readOne(Request $request, int $id): JsonResponse
    {
        InAppNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('id', $id)
            ->update(['read_at' => now()]);
        return response()->json(['ok' => true]);
    }
}

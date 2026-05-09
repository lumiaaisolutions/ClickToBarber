<?php

declare(strict_types=1);

namespace App\Http\Common\Controllers;

use App\Domain\Engagement\Models\PushSubscription;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoints para registrar/borrar Web Push subscriptions desde el browser.
 *
 *  POST /api/push/subscribe   → upsert subscription (auth opcional).
 *  DELETE /api/push/unsubscribe → borrar (debe enviar el endpoint).
 *
 * El envío real de notificaciones (VAPID) lo hace `SendPushNotification`
 * cuando esté implementado. Por ahora el subscriber funciona para que el
 * cliente conceda permisos y persistamos el endpoint.
 */
final class PushSubscriptionController extends Controller
{
    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint'         => ['required', 'string', 'max:1000', 'url'],
            'keys.p256dh'      => ['required', 'string', 'max:200'],
            'keys.auth'        => ['required', 'string', 'max:100'],
        ]);

        $userId  = $request->user()?->id;
        $tenantId = $request->user()?->tenant_id;

        $sub = PushSubscription::query()->updateOrCreate(
            // Si hay user, hacemos upsert por (user_id, endpoint).
            // Si NO hay user (cliente público), simplemente endpoint.
            $userId
                ? ['user_id' => $userId, 'endpoint' => $data['endpoint']]
                : ['user_id' => null, 'endpoint' => $data['endpoint']],
            [
                'tenant_id'    => $tenantId,
                'p256dh_key'   => $data['keys']['p256dh'],
                'auth_key'     => $data['keys']['auth'],
                'user_agent'   => substr((string) $request->userAgent(), 0, 300),
                'last_used_at' => now(),
            ],
        );

        return response()->json(['ok' => true, 'id' => $sub->id]);
    }

    public function unsubscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'url'],
        ]);

        PushSubscription::query()
            ->where('endpoint', $data['endpoint'])
            ->delete();

        return response()->json(['ok' => true]);
    }
}

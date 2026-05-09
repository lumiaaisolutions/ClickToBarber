<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Platform\Models\ApiKey;
use App\Domain\Platform\Models\OutboundWebhook;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * API keys + webhooks salientes (Tier Enterprise).
 *  GET   /api/admin/platform/keys
 *  POST  /api/admin/platform/keys              { name, scopes[], expires_in_days? }
 *  POST  /api/admin/platform/keys/{id}/revoke
 *  GET   /api/admin/platform/webhooks
 *  POST  /api/admin/platform/webhooks          { url, events[] }
 *  DELETE /api/admin/platform/webhooks/{id}
 */
final class PlatformController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function listKeys(): JsonResponse
    {
        $tenant = $this->current->require();
        $keys = ApiKey::query()
            ->where('tenant_id', $tenant->id)
            ->orderByDesc('id')->get();

        return response()->json($keys->map(fn (ApiKey $k) => [
            'id'         => $k->id,
            'name'       => $k->name,
            'prefix'     => $k->prefix,
            'scopes'     => $k->scopes,
            'last_used_at' => $k->last_used_at?->toIso8601String(),
            'expires_at' => $k->expires_at?->toIso8601String(),
            'revoked_at' => $k->revoked_at?->toIso8601String(),
        ]));
    }

    public function issueKey(Request $request): JsonResponse
    {
        $this->guardAdmin($request);
        $tenant = $this->current->require();

        $data = $request->validate([
            'name'              => ['required', 'string', 'max:80'],
            'scopes'            => ['required', 'array', 'min:1'],
            'scopes.*'          => ['string', 'max:80'],
            'expires_in_days'   => ['nullable', 'integer', 'min:1', 'max:1825'],
        ]);

        [$key, $plain] = ApiKey::issue(
            $tenant->id, $data['name'], $data['scopes'],
            $request->user()->id,
            $data['expires_in_days'] ?? null,
        );

        return response()->json([
            'id'     => $key->id,
            'token'  => $plain, // sólo se muestra una vez
            'prefix' => $key->prefix,
        ], 201);
    }

    public function revokeKey(Request $request, int $id): JsonResponse
    {
        $this->guardAdmin($request);
        $tenant = $this->current->require();

        $key = ApiKey::query()->where('tenant_id', $tenant->id)->where('id', $id)->firstOrFail();
        $key->forceFill(['revoked_at' => now()])->save();

        return response()->json(['ok' => true]);
    }

    public function listWebhooks(): JsonResponse
    {
        $tenant = $this->current->require();
        $webhooks = OutboundWebhook::query()
            ->where('tenant_id', $tenant->id)
            ->orderByDesc('id')->get();

        return response()->json($webhooks->map(fn (OutboundWebhook $wh) => [
            'id'              => $wh->id,
            'url'             => $wh->url,
            'events'          => $wh->events,
            'is_active'       => $wh->is_active,
            'consecutive_failures' => $wh->consecutive_failures,
            'last_success_at' => $wh->last_success_at?->toIso8601String(),
            'last_failure_at' => $wh->last_failure_at?->toIso8601String(),
        ]));
    }

    public function createWebhook(Request $request): JsonResponse
    {
        $this->guardAdmin($request);
        $tenant = $this->current->require();

        $data = $request->validate([
            'url'      => ['required', 'url', 'max:500'],
            'events'   => ['required', 'array', 'min:1'],
            'events.*' => ['string', 'max:80'],
        ]);

        $webhook = OutboundWebhook::create([
            'tenant_id' => $tenant->id,
            'url'       => $data['url'],
            'events'    => $data['events'],
            'secret'    => OutboundWebhook::newSecret(),
            'is_active' => true,
        ]);

        return response()->json([
            'id'     => $webhook->id,
            'secret' => $webhook->secret, // sólo se muestra una vez
            'events' => $webhook->events,
        ], 201);
    }

    public function deleteWebhook(Request $request, int $id): JsonResponse
    {
        $this->guardAdmin($request);
        $tenant = $this->current->require();
        $wh = OutboundWebhook::query()->where('tenant_id', $tenant->id)->where('id', $id)->firstOrFail();
        $wh->delete();

        return response()->json(['ok' => true]);
    }

    private function guardAdmin(Request $request): void
    {
        $u = $request->user();
        if (! $u || ! $u->isAdmin()) {
            abort(response()->json(['error' => 'admin_only'], 403));
        }
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Calendar\Models\CalendarConnection;
use App\Http\Controllers\Controller;
use App\Infrastructure\Integrations\Google\GoogleOauthClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Conexión OAuth con Google Calendar para sincronizar citas del barbero/admin
 * activo en su calendario personal.
 */
final class CalendarController extends Controller
{
    public function __construct(private GoogleOauthClient $google) {}

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $connection = CalendarConnection::query()
            ->where('user_id', $user->id)
            ->where('provider', 'google')
            ->first();

        return response()->json([
            'configured' => $this->google->isConfigured(),
            'connected'  => (bool) $connection?->is_active,
            'account'    => $connection?->account_email,
            'last_synced_at' => $connection?->last_synced_at?->toIso8601String(),
        ]);
    }

    public function googleStart(Request $request): JsonResponse
    {
        if (! $this->google->isConfigured()) {
            return response()->json([
                'error' => 'google_not_configured',
                'message' => 'Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el backend.',
            ], 503);
        }

        $state = Str::random(40);
        Cache::put('google_oauth_state:' . $state, $request->user()->id, 600); // 10 min

        return response()->json([
            'authorize_url' => $this->google->authorizationUrl($state),
        ]);
    }

    public function googleCallback(Request $request): RedirectResponse
    {
        $code  = (string) $request->query('code', '');
        $state = (string) $request->query('state', '');

        if ($code === '' || $state === '') {
            return redirect()->away((string) env('FRONTEND_URL') . '/admin/calendar?error=missing_params');
        }

        $userId = Cache::pull('google_oauth_state:' . $state);
        if (! $userId) {
            return redirect()->away((string) env('FRONTEND_URL') . '/admin/calendar?error=state_expired');
        }

        try {
            $tokens = $this->google->exchangeCode($code);
        } catch (\Throwable $e) {
            return redirect()->away((string) env('FRONTEND_URL') . '/admin/calendar?error=' . urlencode('exchange_failed'));
        }

        $user = \App\Domain\Identity\Models\User::query()
            ->withoutGlobalScopes()
            ->findOrFail($userId);

        CalendarConnection::query()->updateOrCreate(
            ['user_id' => $user->id, 'provider' => 'google'],
            [
                'tenant_id'                => $user->tenant_id,
                'access_token'             => $tokens['access_token'],
                'refresh_token'            => $tokens['refresh_token'] ?? null,
                'access_token_expires_at'  => now()->addSeconds((int) ($tokens['expires_in'] ?? 3600)),
                'scope'                    => $tokens['scope'] ?? null,
                'is_active'                => true,
            ],
        );

        return redirect()->away((string) env('FRONTEND_URL') . '/admin/calendar?connected=1');
    }

    public function disconnect(Request $request): JsonResponse
    {
        CalendarConnection::query()
            ->where('user_id', $request->user()->id)
            ->where('provider', 'google')
            ->delete();

        return response()->json(['ok' => true]);
    }
}

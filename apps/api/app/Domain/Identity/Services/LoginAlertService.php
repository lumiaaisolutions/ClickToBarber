<?php

declare(strict_types=1);

namespace App\Domain\Identity\Services;

use App\Domain\Identity\Models\User;
use App\Domain\Identity\Models\UserLoginEvent;
use App\Domain\Notifications\Services\SendWhatsapp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Detecta logins desde IP/UA inusual y notifica al usuario.
 *
 * Heurística:
 *   - Si la combinación (ip_address, user_agent_hash) NO se vio en los
 *     últimos N días (config: LOGIN_ALERT_LOOKBACK_DAYS, default 30) →
 *     alerta vía WhatsApp si phone, mail siempre.
 *   - Reduce ruido: el primer login de un nuevo user nunca dispara alerta.
 */
final class LoginAlertService
{
    public function __construct(private SendWhatsapp $whatsapp) {}

    public function recordSuccessAndMaybeAlert(User $user, Request $request): UserLoginEvent
    {
        $ip = (string) $request->ip();
        $ua = (string) $request->userAgent();
        $uaHash = hash('sha256', $ua);

        $lookbackDays = (int) config('observability.login_alert.lookback_days', 30);
        $window = now()->subDays($lookbackDays);

        $totalRecent = UserLoginEvent::query()
            ->where('user_id', $user->id)
            ->where('result', UserLoginEvent::RESULT_SUCCESS)
            ->where('created_at', '>=', $window)
            ->count();

        $isFirstEverLogin = $totalRecent === 0;

        $seenBefore = UserLoginEvent::query()
            ->where('user_id', $user->id)
            ->where('result', UserLoginEvent::RESULT_SUCCESS)
            ->where('ip_address', $ip)
            ->where('user_agent_hash', $uaHash)
            ->where('created_at', '>=', $window)
            ->exists();

        $shouldAlert = ! $seenBefore && ! $isFirstEverLogin;

        $event = UserLoginEvent::create([
            'tenant_id'       => $user->tenant_id,
            'user_id'         => $user->id,
            'ip_address'      => $ip,
            'user_agent_hash' => $uaHash,
            'user_agent'      => substr($ua, 0, 500),
            'result'          => UserLoginEvent::RESULT_SUCCESS,
            'alert_sent'      => $shouldAlert,
            'created_at'      => now(),
        ]);

        if ($shouldAlert) {
            $this->dispatchAlert($user, $ip, $ua);
        }

        return $event;
    }

    public function recordFailure(User $user, Request $request, string $result): UserLoginEvent
    {
        return UserLoginEvent::create([
            'tenant_id'       => $user->tenant_id,
            'user_id'         => $user->id,
            'ip_address'      => $request->ip(),
            'user_agent_hash' => hash('sha256', (string) $request->userAgent()),
            'user_agent'      => substr((string) $request->userAgent(), 0, 500),
            'result'          => $result,
            'alert_sent'      => false,
            'created_at'      => now(),
        ]);
    }

    private function dispatchAlert(User $user, string $ip, string $userAgent): void
    {
        try {
            if ($user->phone) {
                $this->whatsapp->execute(
                    tenantId: (string) ($user->tenant_id ?? ''),
                    to: (string) $user->phone,
                    template: 'login_new_device',
                    params: [
                        'name' => $user->name,
                        'ip'   => $ip,
                        'when' => now()->format('d M Y H:i'),
                    ],
                    userId: $user->id,
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Login alert WhatsApp falló', ['user' => $user->id, 'error' => $e->getMessage()]);
        }
    }
}

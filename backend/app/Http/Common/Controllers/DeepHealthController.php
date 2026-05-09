<?php

declare(strict_types=1);

namespace App\Http\Common\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;

/**
 * GET /api/up/deep — verifica DB + Redis + Stripe + Meta.
 * Devuelve 200 si todos OK, 503 si alguno falla.
 *
 * Útil para load balancers que necesitan verificar dependencias completas.
 * El /up estándar de Laravel sólo verifica que PHP responde.
 */
final class DeepHealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'php'      => ['ok' => true, 'detail' => PHP_VERSION],
            'db'       => $this->checkDb(),
            'redis'    => $this->checkRedis(),
            'stripe'   => $this->checkStripe(),
            'meta'     => $this->checkMeta(),
            'mail'     => ['ok' => true, 'detail' => config('mail.default')],
        ];

        $allOk = collect($checks)->every(fn ($c) => $c['ok'] === true || $c['ok'] === 'skipped');

        return response()->json([
            'ok'        => $allOk,
            'service'   => 'lumia-api',
            'version'   => env('APP_VERSION', 'dev'),
            'env'       => app()->environment(),
            'time'      => now()->toIso8601String(),
            'checks'    => $checks,
        ], $allOk ? 200 : 503);
    }

    private function checkDb(): array
    {
        try {
            DB::connection()->getPdo();
            $latencyMs = $this->timed(fn () => DB::select('SELECT 1'));
            return ['ok' => true, 'driver' => DB::connection()->getDriverName(), 'latency_ms' => $latencyMs];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    private function checkRedis(): array
    {
        try {
            $r = Redis::ping();
            return ['ok' => true, 'reply' => is_string($r) ? $r : 'PONG'];
        } catch (\Throwable $e) {
            // Redis es opcional en dev — fallback a "skipped" si CACHE_STORE != redis
            if (config('cache.default') !== 'redis') {
                return ['ok' => 'skipped', 'reason' => 'cache.default != redis'];
            }
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    private function checkStripe(): array
    {
        if (! config('services.stripe.secret')) {
            return ['ok' => 'skipped', 'reason' => 'no STRIPE_SECRET'];
        }
        try {
            $r = Http::timeout(3)
                ->withBasicAuth((string) config('services.stripe.secret'), '')
                ->get('https://api.stripe.com/v1/balance');
            return ['ok' => $r->successful(), 'status' => $r->status()];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    private function checkMeta(): array
    {
        $token = config('services.meta_whatsapp.token');
        if (! $token) {
            return ['ok' => 'skipped', 'reason' => 'no WHATSAPP_TOKEN'];
        }
        try {
            $phoneId = config('services.meta_whatsapp.phone_id');
            $r = Http::withToken((string) $token)
                ->timeout(3)
                ->get("https://graph.facebook.com/v20.0/{$phoneId}");
            return ['ok' => $r->successful(), 'status' => $r->status()];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    private function timed(callable $fn): int
    {
        $start = microtime(true);
        $fn();
        return (int) round((microtime(true) - $start) * 1000);
    }
}

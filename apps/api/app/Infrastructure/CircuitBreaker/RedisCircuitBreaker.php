<?php

declare(strict_types=1);

namespace App\Infrastructure\CircuitBreaker;

use Illuminate\Contracts\Redis\Factory as RedisFactory;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Circuit Breaker basado en Redis con scripts Lua atómicos.
 * Estados: closed → open → half_open → closed.
 */
final class RedisCircuitBreaker implements CircuitBreaker
{
    /**
     * @param  array<string, array{failure_threshold:int,failure_window:int,cooldown:int,success_threshold:int}>  $integrations
     * @param  array{failure_threshold:int,failure_window:int,cooldown:int,success_threshold:int}  $defaults
     */
    public function __construct(
        private readonly RedisFactory $redis,
        private readonly array $integrations,
        private readonly array $defaults,
        private readonly bool $enabled = true,
    ) {}

    public function call(string $integration, callable $operation, ?string $scope = null): mixed
    {
        if (! $this->enabled) {
            return $operation();
        }

        $decision = $this->acquire($integration, $scope);

        if ($decision === 'rejected_open' || $decision === 'rejected_half_open') {
            throw new CircuitOpenException($integration, $scope);
        }

        try {
            $result = $operation();
            $this->recordSuccess($integration, $scope);
            return $result;
        } catch (Throwable $e) {
            $this->recordFailure($integration, $scope, $e);
            throw $e;
        }
    }

    public function state(string $integration, ?string $scope = null): CircuitState
    {
        try {
            $value = $this->client()->get($this->key($integration, $scope, 'state')) ?: 'closed';
            return CircuitState::from($value);
        } catch (Throwable) {
            return CircuitState::Closed;
        }
    }

    public function forceOpen(string $integration, ?string $scope = null): void
    {
        try {
            $client = $this->client();
            $client->set($this->key($integration, $scope, 'state'), CircuitState::Open->value);
            $client->set($this->key($integration, $scope, 'opened_at'), (string) time());
        } catch (Throwable) {}
    }

    public function forceClose(string $integration, ?string $scope = null): void
    {
        try {
            $client = $this->client();
            $client->set($this->key($integration, $scope, 'state'), CircuitState::Closed->value);
            $client->del([
                $this->key($integration, $scope, 'failures'),
                $this->key($integration, $scope, 'opened_at'),
                $this->key($integration, $scope, 'half_open_successes'),
            ]);
        } catch (Throwable) {}
    }

    private function acquire(string $integration, ?string $scope): string
    {
        try {
            $cfg = $this->config($integration);
            return (string) $this->client()->eval(
                self::ACQUIRE_LUA,
                4,
                $this->key($integration, $scope, 'state'),
                $this->key($integration, $scope, 'opened_at'),
                $this->key($integration, $scope, 'half_open_lock'),
                $this->key($integration, $scope, 'half_open_successes'),
                (string) $cfg['cooldown'],
                (string) time(),
                (string) ($cfg['failure_window']),
            );
        } catch (Throwable $e) {
            // Si Redis no está disponible, dejamos pasar (degradación grácil)
            Log::warning('CircuitBreaker: Redis no disponible, allowing call', ['error' => $e->getMessage()]);
            return 'ok';
        }
    }

    private function recordSuccess(string $integration, ?string $scope): void
    {
        try {
            $cfg = $this->config($integration);
            $this->client()->eval(
                self::SUCCESS_LUA,
                5,
                $this->key($integration, $scope, 'state'),
                $this->key($integration, $scope, 'failures'),
                $this->key($integration, $scope, 'opened_at'),
                $this->key($integration, $scope, 'half_open_lock'),
                $this->key($integration, $scope, 'half_open_successes'),
                (string) $cfg['success_threshold'],
            );
        } catch (Throwable) {}
    }

    private function recordFailure(string $integration, ?string $scope, Throwable $e): void
    {
        try {
            $cfg = $this->config($integration);
            $this->client()->eval(
                self::FAILURE_LUA,
                4,
                $this->key($integration, $scope, 'state'),
                $this->key($integration, $scope, 'failures'),
                $this->key($integration, $scope, 'opened_at'),
                $this->key($integration, $scope, 'half_open_lock'),
                (string) $cfg['failure_threshold'],
                (string) $cfg['failure_window'],
                (string) time(),
            );
            Log::warning("CircuitBreaker[{$integration}] failure registered", [
                'error' => $e->getMessage(),
                'scope' => $scope,
            ]);
        } catch (Throwable) {}
    }

    /**
     * @return array{failure_threshold:int,failure_window:int,cooldown:int,success_threshold:int}
     */
    private function config(string $integration): array
    {
        return $this->integrations[$integration] ?? $this->defaults;
    }

    private function key(string $integration, ?string $scope, string $suffix): string
    {
        $scope = $scope ? ":{$scope}" : '';
        return "cb:{$integration}{$scope}:{$suffix}";
    }

    private function client(): \Illuminate\Redis\Connections\Connection
    {
        return $this->redis->connection();
    }

    /**
     * KEYS[1]=state KEYS[2]=opened_at KEYS[3]=half_open_lock KEYS[4]=half_open_successes
     * ARGV[1]=cooldown ARGV[2]=now ARGV[3]=failure_window
     */
    private const ACQUIRE_LUA = <<<'LUA'
local state = redis.call('GET', KEYS[1]) or 'closed'
local now = tonumber(ARGV[2])
local cooldown = tonumber(ARGV[1])

if state == 'open' then
    local opened_at = tonumber(redis.call('GET', KEYS[2]) or '0')
    if (now - opened_at) >= cooldown then
        redis.call('SET', KEYS[1], 'half_open')
        redis.call('SET', KEYS[4], '0')
        local got = redis.call('SET', KEYS[3], '1', 'NX', 'EX', 30)
        if got then return 'ok' end
        return 'rejected_half_open'
    end
    return 'rejected_open'
end

if state == 'half_open' then
    local got = redis.call('SET', KEYS[3], '1', 'NX', 'EX', 30)
    if got then return 'ok' end
    return 'rejected_half_open'
end

return 'ok'
LUA;

    /**
     * KEYS[1]=state KEYS[2]=failures KEYS[3]=opened_at KEYS[4]=half_open_lock KEYS[5]=half_open_successes
     * ARGV[1]=success_threshold
     */
    private const SUCCESS_LUA = <<<'LUA'
local state = redis.call('GET', KEYS[1]) or 'closed'
local threshold = tonumber(ARGV[1])

if state == 'half_open' then
    local s = tonumber(redis.call('INCR', KEYS[5]))
    redis.call('DEL', KEYS[4])
    if s >= threshold then
        redis.call('SET', KEYS[1], 'closed')
        redis.call('DEL', KEYS[2], KEYS[3], KEYS[5])
        return 'closed'
    end
    return 'half_open'
end

redis.call('DEL', KEYS[2])
return 'closed'
LUA;

    /**
     * KEYS[1]=state KEYS[2]=failures KEYS[3]=opened_at KEYS[4]=half_open_lock
     * ARGV[1]=failure_threshold ARGV[2]=failure_window ARGV[3]=now
     */
    private const FAILURE_LUA = <<<'LUA'
local state = redis.call('GET', KEYS[1]) or 'closed'
local now = tonumber(ARGV[3])

if state == 'half_open' then
    redis.call('SET', KEYS[1], 'open')
    redis.call('SET', KEYS[3], tostring(now))
    redis.call('DEL', KEYS[4])
    return 'open'
end

local count = tonumber(redis.call('INCR', KEYS[2]))
if count == 1 then
    redis.call('EXPIRE', KEYS[2], tonumber(ARGV[2]))
end

if count >= tonumber(ARGV[1]) then
    redis.call('SET', KEYS[1], 'open')
    redis.call('SET', KEYS[3], tostring(now))
    return 'open'
end

return 'closed'
LUA;
}

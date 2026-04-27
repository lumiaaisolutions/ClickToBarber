<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\Appointments\Repositories\Contracts\AppointmentRepository;
use App\Domain\Appointments\Repositories\EloquentAppointmentRepository;
use App\Domain\Notifications\Contracts\WhatsappClient;
use App\Domain\Payments\Contracts\PaymentGateway;
use App\Domain\Subscriptions\Contracts\FeatureGate;
use App\Domain\Subscriptions\Services\PlanFeatureGate;
use App\Domain\Tenancy\CurrentTenant;
use App\Infrastructure\CircuitBreaker\CircuitBreaker;
use App\Infrastructure\CircuitBreaker\RedisCircuitBreaker;
use App\Infrastructure\Integrations\MetaWhatsapp\LogWhatsappClient;
use App\Infrastructure\Integrations\Stripe\MockStripeGateway;
use Illuminate\Contracts\Redis\Factory as RedisFactory;
use Illuminate\Support\ServiceProvider;

final class DomainServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Tenant resuelto en cada request
        $this->app->singleton(CurrentTenant::class);

        // Repositorios
        $this->app->bind(AppointmentRepository::class, EloquentAppointmentRepository::class);

        // Feature Gate
        $this->app->bind(FeatureGate::class, PlanFeatureGate::class);

        // Integraciones (drivers seleccionables por env)
        $this->app->bind(WhatsappClient::class, function ($app) {
            return match (env('WHATSAPP_DRIVER', 'log')) {
                default => $app->make(LogWhatsappClient::class),
            };
        });

        $this->app->bind(PaymentGateway::class, function ($app) {
            return match (env('STRIPE_DRIVER', 'mock')) {
                default => $app->make(MockStripeGateway::class),
            };
        });

        // Circuit Breaker
        $this->app->singleton(CircuitBreaker::class, function ($app) {
            $cfg = $app['config']->get('circuit-breaker');
            return new RedisCircuitBreaker(
                redis:        $app->make(RedisFactory::class),
                integrations: $cfg['integrations'] ?? [],
                defaults:     $cfg['default'],
                enabled:      (bool) ($cfg['enabled'] ?? true),
            );
        });
    }

    public function boot(): void
    {
        // Listeners de eventos cross-domain
        \Illuminate\Support\Facades\Event::listen(
            \App\Domain\Appointments\Events\AppointmentBooked::class,
            \App\Domain\Notifications\Listeners\NotifyAppointmentBooked::class,
        );
    }
}

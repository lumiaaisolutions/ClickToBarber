<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\Appointments\Repositories\Contracts\AppointmentRepository;
use App\Domain\Appointments\Repositories\EloquentAppointmentRepository;
use App\Domain\Notifications\Contracts\VoiceClient;
use App\Domain\Notifications\Contracts\WhatsappClient;
use App\Domain\Payments\Contracts\PaymentGateway;
use App\Domain\Subscriptions\Contracts\FeatureGate;
use App\Domain\Subscriptions\Services\PlanFeatureGate;
use App\Domain\Tenancy\CurrentTenant;
use App\Infrastructure\CircuitBreaker\CircuitBreaker;
use App\Infrastructure\CircuitBreaker\RedisCircuitBreaker;
use App\Domain\Billing\Contracts\CfdiPac;
use App\Infrastructure\Integrations\Cfdi\FinkokCfdiPac;
use App\Infrastructure\Integrations\Cfdi\NullCfdiPac;
use App\Infrastructure\Integrations\MetaWhatsapp\LogWhatsappClient;
use App\Infrastructure\Integrations\MetaWhatsapp\MetaWhatsappClient;
use App\Infrastructure\Integrations\Stripe\MockStripeGateway;
use App\Infrastructure\Integrations\Twilio\TwilioVoiceClient;
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
        // Voice (Twilio) — el propio TwilioVoiceClient hace fallback a log
        // cuando el driver no está configurado, así que un solo binding sirve
        // para dev y prod.
        $this->app->bind(VoiceClient::class, TwilioVoiceClient::class);

        $this->app->bind(WhatsappClient::class, function ($app) {
            $driver = (string) ($app['config']->get('services.meta_whatsapp.driver') ?? env('WHATSAPP_DRIVER', 'log'));

            return match ($driver) {
                'meta'  => $app->make(MetaWhatsappClient::class),
                default => $app->make(LogWhatsappClient::class),
            };
        });

        $this->app->bind(PaymentGateway::class, function ($app) {
            $driver = (string) ($app['config']->get('services.stripe.driver') ?? env('STRIPE_DRIVER', 'mock'));

            return match ($driver) {
                // 'stripe' driver delegado a CreateCheckoutSession; aquí el gateway de
                // depósitos puntuales sigue siendo el mock hasta implementar charges
                // reales (PaymentIntents). Ver docs/PRODUCTION_READINESS.md B2.
                default => $app->make(MockStripeGateway::class),
            };
        });

        // CFDI PAC — Finkok / SW Sapien / Null
        $this->app->bind(CfdiPac::class, function () {
            return match (env('CFDI_DRIVER', 'null')) {
                'finkok' => new FinkokCfdiPac(),
                default  => new NullCfdiPac(),
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

        // Loyalty + referrals: cuando una cita se completa se acreditan visitas.
        \Illuminate\Support\Facades\Event::listen(
            \App\Domain\Appointments\Events\AppointmentCompleted::class,
            \App\Domain\Growth\Listeners\HandleAppointmentCompleted::class,
        );

        // Engagement: emite token de calificación + WhatsApp post-visita.
        \Illuminate\Support\Facades\Event::listen(
            \App\Domain\Appointments\Events\AppointmentCompleted::class,
            \App\Domain\Engagement\Listeners\IssueRatingTokenOnCompletion::class,
        );

        // Calendar sync — push a Google Calendar del barbero ante cualquier
        // transición de cita. SOLO se cablea fuera de testing porque en
        // sync queue el job se ejecutaría dentro de la transacción del test.
        if (! app()->runningUnitTests()) {
            foreach ([
                \App\Domain\Appointments\Events\AppointmentBooked::class,
                \App\Domain\Appointments\Events\AppointmentConfirmed::class,
                \App\Domain\Appointments\Events\AppointmentCancelled::class,
                \App\Domain\Appointments\Events\AppointmentCompleted::class,
            ] as $event) {
                \Illuminate\Support\Facades\Event::listen(
                    $event,
                    \App\Domain\Calendar\Listeners\DispatchGoogleSync::class,
                );

                // Outbound webhooks — broadcasta los eventos a las URLs
                // suscritas por el tenant. Igual que Calendar, off en tests.
                \Illuminate\Support\Facades\Event::listen(
                    $event,
                    \App\Domain\Platform\Listeners\BroadcastDomainEvent::class,
                );
            }
        }
    }
}

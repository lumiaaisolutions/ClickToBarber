<?php

declare(strict_types=1);

namespace App\Infrastructure\Observability;

/**
 * Stub de OpenTelemetry para LUMIA.
 *
 * Cuando se instale `open-telemetry/sdk` y `open-telemetry/exporter-otlp`
 * via composer, este service expondrá:
 *  - tracer global con resource `service.name=lumia-api`.
 *  - root span por request HTTP (auto via middleware OTel).
 *  - spans manuales para BookAppointment, SendWhatsapp, etc.
 *
 * Por ahora, sólo provee facade no-op para que el resto del código pueda
 * llamar `Tracing::span(...)` sin instalar nada.
 */
final class TracingHooks
{
    public static function span(string $name, callable $fn, array $attributes = []): mixed
    {
        // No-op en esta primera iteración.
        return $fn();
    }

    public static function event(string $name, array $attributes = []): void
    {
        // No-op.
    }
}

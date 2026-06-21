<?php

declare(strict_types=1);

namespace App\Http\Webhooks\Controllers;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Billing\Models\Subscription;
use App\Domain\Billing\Models\WebhookEvent;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

/**
 * Endpoint Prometheus minimal en /api/metrics.
 *
 * Output formato text/plain según spec:
 *   https://prometheus.io/docs/instrumenting/exposition_formats/
 *
 * Métricas:
 *   - lumia_appointments_total{status}: contador por estado
 *   - lumia_subscriptions_total{status}: contador por estado de subscription
 *   - lumia_webhook_events_total{provider, status}: webhooks recibidos
 *   - lumia_tenants_total: total de tenants activos
 *
 * Protección: por default sólo accesible desde 127.0.0.1 (localhost).
 * En producción, exponer detrás de auth básica o en red privada.
 */
final class MetricsController extends Controller
{
    public function __invoke(): Response
    {
        if (! request()->ip() || ! in_array(request()->ip(), ['127.0.0.1', '::1', 'localhost'], true)) {
            // En producción, ProxyTrust + IP allowlist o middleware de auth.
            if (! app()->isLocal()) {
                abort(403);
            }
        }

        $lines = [];

        $lines[] = '# HELP lumia_appointments_total Citas por estado';
        $lines[] = '# TYPE lumia_appointments_total counter';
        $byStatus = Appointment::query()
            ->withoutGlobalScopes()
            ->selectRaw('status, COUNT(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status');
        foreach ($byStatus as $status => $count) {
            $lines[] = sprintf('lumia_appointments_total{status="%s"} %d', $status, $count);
        }

        $lines[] = '# HELP lumia_subscriptions_total Suscripciones por estado';
        $lines[] = '# TYPE lumia_subscriptions_total counter';
        $bySubStatus = Subscription::query()
            ->selectRaw('status, COUNT(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status');
        foreach ($bySubStatus as $status => $count) {
            $lines[] = sprintf('lumia_subscriptions_total{status="%s"} %d', $status, $count);
        }

        $lines[] = '# HELP lumia_webhook_events_total Webhooks recibidos';
        $lines[] = '# TYPE lumia_webhook_events_total counter';
        $byProvider = WebhookEvent::query()
            ->selectRaw('provider, status, COUNT(*) as c')
            ->groupBy('provider', 'status')
            ->get();
        foreach ($byProvider as $row) {
            $lines[] = sprintf(
                'lumia_webhook_events_total{provider="%s",status="%s"} %d',
                $row->provider, $row->status, $row->c,
            );
        }

        $lines[] = '# HELP lumia_tenants_total Tenants activos';
        $lines[] = '# TYPE lumia_tenants_total gauge';
        $tenants = \App\Domain\Tenancy\Models\Tenant::query()->withoutGlobalScopes()->count();
        $lines[] = sprintf('lumia_tenants_total %d', $tenants);

        return response(implode("\n", $lines) . "\n", 200, [
            'Content-Type' => 'text/plain; version=0.0.4; charset=utf-8',
        ]);
    }
}

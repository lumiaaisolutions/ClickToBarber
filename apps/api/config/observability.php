<?php

declare(strict_types=1);

return [
    'sentry_dsn'     => env('SENTRY_DSN', ''),
    'sentry_environment' => env('SENTRY_ENVIRONMENT', env('APP_ENV', 'local')),
    'sentry_release' => env('SENTRY_RELEASE', 'dev'),

    /*
    |---------------------------------------------------------------------------
    | Login alerting
    |---------------------------------------------------------------------------
    | Después de un login exitoso, comparamos IP + UA contra la ventana
    | reciente. Si es la primera vez que se ven juntos en N días, mandamos
    | alerta por email/WhatsApp (template `login_new_device`).
    */
    'login_alert' => [
        'lookback_days' => (int) env('LOGIN_ALERT_LOOKBACK_DAYS', 30),
    ],
];

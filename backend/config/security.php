<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Webhook signing secrets
    |--------------------------------------------------------------------------
    | Secrets compartidos con cada proveedor para validar HMAC en el middleware
    | VerifyWebhookSignature. Si están vacíos en producción, el middleware
    | rechaza con 503; en dev (APP_ENV != production) deja pasar y registra
    | una advertencia.
    */
    'webhooks' => [
        'stripe' => [
            'secret' => env('STRIPE_WEBHOOK_SECRET', ''),
        ],
        'meta' => [
            'secret' => env('META_WEBHOOK_SECRET', ''),
        ],
        'twilio' => [
            'secret' => env('TWILIO_AUTH_TOKEN', ''),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Throttling por endpoint
    |--------------------------------------------------------------------------
    | Límites por endpoint sensible. La key real combina IP + email cuando
    | aplica. Ver routes/api.php y AppServiceProvider::configureRateLimiters().
    */
    'throttle' => [
        'login' => [
            'attempts'    => (int) env('THROTTLE_LOGIN_ATTEMPTS', 5),
            'decay_minutes' => (int) env('THROTTLE_LOGIN_DECAY', 1),
        ],
        'booking' => [
            'attempts'    => (int) env('THROTTLE_BOOKING_ATTEMPTS', 10),
            'decay_minutes' => (int) env('THROTTLE_BOOKING_DECAY', 1),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Magic link / single-use tokens
    |--------------------------------------------------------------------------
    */
    'magic_links' => [
        'ttl_minutes' => (int) env('MAGIC_LINK_TTL', 60 * 24), // 24h
    ],
];

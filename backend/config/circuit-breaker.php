<?php

declare(strict_types=1);

return [
    'default' => [
        'failure_threshold' => (int) env('CB_DEFAULT_FAILURE_THRESHOLD', 5),
        'failure_window'    => (int) env('CB_DEFAULT_FAILURE_WINDOW', 60),
        'cooldown'          => (int) env('CB_DEFAULT_COOLDOWN', 30),
        'success_threshold' => (int) env('CB_DEFAULT_SUCCESS_THRESHOLD', 2),
    ],

    'integrations' => [
        'whatsapp' => [
            'failure_threshold' => 5,
            'failure_window'    => 60,
            'cooldown'          => 30,
            'success_threshold' => 2,
        ],
        'stripe' => [
            'failure_threshold' => 3,
            'failure_window'    => 60,
            'cooldown'          => 60,
            'success_threshold' => 2,
        ],
        'mercadopago' => [
            'failure_threshold' => 5,
            'failure_window'    => 60,
            'cooldown'          => 45,
            'success_threshold' => 2,
        ],
        'twilio_voice' => [
            'failure_threshold' => 5,
            'failure_window'    => 120,
            'cooldown'          => 90,
            'success_threshold' => 2,
        ],
    ],

    // Si Redis no está disponible (dev sin docker), el breaker degrada a "siempre cerrado".
    'enabled' => (bool) env('CB_ENABLED', true),
];

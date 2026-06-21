<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel'              => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'stripe' => [
        'driver'         => env('STRIPE_DRIVER', 'mock'),
        'key'            => env('STRIPE_KEY'),
        'secret'         => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'success_url'    => env('STRIPE_SUCCESS_URL', 'http://localhost:3000/checkout/success'),
        'cancel_url'     => env('STRIPE_CANCEL_URL', 'http://localhost:3000/precios'),
    ],

    'mercadopago' => [
        'driver' => env('MERCADOPAGO_DRIVER', 'mock'),
        'token'  => env('MERCADOPAGO_TOKEN'),
    ],

    'meta_whatsapp' => [
        'driver'        => env('WHATSAPP_DRIVER', 'log'),
        'phone_id'      => env('WHATSAPP_PHONE_ID'),
        'token'         => env('WHATSAPP_TOKEN'),
        'api_version'   => env('WHATSAPP_API_VERSION', 'v20.0'),
        'webhook_verify_token' => env('META_WEBHOOK_VERIFY_TOKEN'),
        'templates' => [
            'confirmation'   => env('WHATSAPP_TPL_CONFIRMATION', 'appointment_confirmation'),
            'reminder_24h'   => env('WHATSAPP_TPL_REMINDER_24H', 'appointment_reminder_24h'),
            'reminder_2h'    => env('WHATSAPP_TPL_REMINDER_2H', 'appointment_reminder_2h_with_buttons'),
            'cancelled'      => env('WHATSAPP_TPL_CANCELLED', 'appointment_cancelled_no_response'),
            'referral_invite' => env('WHATSAPP_TPL_REFERRAL_INVITE', 'referral_invite'),
            'post_visit_rating' => env('WHATSAPP_TPL_RATING', 'post_visit_rating'),
            'login_new_device'  => env('WHATSAPP_TPL_LOGIN_ALERT', 'login_new_device'),
        ],
    ],

    'twilio' => [
        'driver' => env('TWILIO_DRIVER', 'log'),
        'sid'    => env('TWILIO_SID'),
        'token'  => env('TWILIO_TOKEN'),
        'from'   => env('TWILIO_FROM'),
    ],

];

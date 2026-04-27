<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Subscriptions\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'code'        => 'free',
                'name'        => 'Free',
                'description' => 'Empieza gratis con agenda básica para 1 barbero.',
                'price_cents' => 0,
                'currency'    => 'MXN',
                'features'    => ['online_booking'],
                'max_barbers' => 1,
                'sort_order'  => 1,
            ],
            [
                'code'        => 'starter',
                'name'        => 'Starter',
                'description' => 'Hasta 5 barberos + WhatsApp de confirmación.',
                'price_cents' => 49900,
                'currency'    => 'MXN',
                'features'    => ['online_booking', 'multi_barbers', 'whatsapp'],
                'max_barbers' => 5,
                'sort_order'  => 2,
            ],
            [
                'code'        => 'pro',
                'name'        => 'Pro',
                'description' => 'POS, marketing de retención, llamadas Twilio. Anti no-show completo.',
                'price_cents' => 99900,
                'currency'    => 'MXN',
                'features'    => [
                    'online_booking', 'multi_barbers', 'whatsapp', 'twilio_voice',
                    'pos_inventory', 'marketing_retention',
                ],
                'max_barbers' => null,
                'sort_order'  => 3,
            ],
            [
                'code'        => 'enterprise',
                'name'        => 'Enterprise',
                'description' => 'Multi-sucursal, reportes avanzados y API.',
                'price_cents' => 199900,
                'currency'    => 'MXN',
                'features'    => [
                    'online_booking', 'multi_barbers', 'whatsapp', 'twilio_voice',
                    'pos_inventory', 'marketing_retention', 'finance_reports',
                    'multi_branch', 'public_api',
                ],
                'max_barbers' => null,
                'sort_order'  => 4,
            ],
        ];

        foreach ($plans as $p) {
            Plan::updateOrCreate(['code' => $p['code']], $p);
        }
    }
}

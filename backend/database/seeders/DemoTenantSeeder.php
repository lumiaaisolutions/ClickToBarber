<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use App\Domain\Catalog\Models\Product;
use App\Domain\Catalog\Models\Service;
use App\Domain\Identity\Models\User;
use App\Domain\Payments\Models\Payment;
use App\Domain\Scheduling\Models\BusinessHour;
use App\Domain\Staff\Models\Barber;
use App\Domain\Staff\Models\BarberShift;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\Models\Tenant;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DemoTenantSeeder extends Seeder
{
    public function run(): void
    {
        $plan = Plan::where('code', 'pro')->firstOrFail();

        $tenant = Tenant::updateOrCreate(
            ['slug' => 'el-navajazo'],
            [
                'id'              => (string) Str::uuid(),
                'name'            => 'Barbería El Navajazo',
                'owner_email'     => 'admin@elnavajazo.test',
                'plan_id'         => $plan->id,
                'plan_status'     => 'active',
                'timezone'        => 'America/Mexico_City',
                'phone'           => '+52 55 0000 1111',
                'whatsapp_number' => '+5215500001111',
                'address'         => 'Av. Reforma 222, CDMX',
                'latitude'        => 19.4326,
                'longitude'       => -99.1332,
                'cover_image_url' => 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1600',
                'logo_url'        => null,
                'settings'        => ['deposit_pct' => 30, 'currency' => 'MXN'],
            ]
        );

        // Admin user
        $admin = User::updateOrCreate(
            ['email' => 'admin@elnavajazo.test'],
            [
                'tenant_id' => $tenant->id,
                'name'      => 'Carlos Mendoza',
                'phone'     => '+5215500001111',
                'role'      => User::ROLE_ADMIN,
                'password'  => bcrypt('password'),
            ]
        );

        // Business hours: Mar-Sáb 10:00-20:00, Domingo cerrado, Lun cerrado
        BusinessHour::where('tenant_id', $tenant->id)->delete();
        $hours = [
            0 => ['10:00', '18:00', true],   // Domingo cerrado
            1 => ['10:00', '20:00', true],   // Lunes cerrado
            2 => ['10:00', '20:00', false],
            3 => ['10:00', '20:00', false],
            4 => ['10:00', '20:00', false],
            5 => ['10:00', '21:00', false],
            6 => ['09:00', '20:00', false],
        ];
        foreach ($hours as $weekday => [$open, $close, $closed]) {
            BusinessHour::create([
                'tenant_id'  => $tenant->id,
                'weekday'    => $weekday,
                'open_time'  => $open,
                'close_time' => $close,
                'is_closed'  => $closed,
            ]);
        }

        // Barberos
        $barberData = [
            ['Diego Ramírez', 'diego@elnavajazo.test', '+5215511110001', ['fade', 'diseño'],   45, 45],
            ['Iván Cordero',  'ivan@elnavajazo.test',  '+5215511110002', ['barba', 'navaja'],  60, 50],
            ['Mateo Salazar', 'mateo@elnavajazo.test', '+5215511110003', ['kids', 'clásico'],  40, 35],
        ];
        $barbers = collect();
        foreach ($barberData as $i => [$name, $email, $phone, $specs, $slot, $commission]) {
            $b = Barber::updateOrCreate(
                ['tenant_id' => $tenant->id, 'email' => $email],
                [
                    'name'                 => $name,
                    'phone'                => $phone,
                    'avatar_url'           => "https://i.pravatar.cc/200?u={$email}",
                    'specialties'          => $specs,
                    'default_slot_minutes' => $slot,
                    'commission_pct'       => $commission,
                    'is_active'            => true,
                    'display_order'        => $i,
                    'bio'                  => 'Barbero con 8+ años de experiencia.',
                ]
            );
            $barbers->push($b);

            BarberShift::where('barber_id', $b->id)->delete();
            for ($wd = 2; $wd <= 6; $wd++) {
                BarberShift::create([
                    'tenant_id'  => $tenant->id,
                    'barber_id'  => $b->id,
                    'weekday'    => $wd,
                    'start_time' => '10:00',
                    'end_time'   => '19:00',
                ]);
            }
        }

        // Servicios
        $serviceData = [
            ['Corte clásico',          'Corte de cabello con tijera y máquina.',     45, 25000],
            ['Corte + barba',          'Corte completo + arreglo de barba.',         75, 38000],
            ['Fade ejecutivo',         'Degradado preciso estilo ejecutivo.',        50, 30000],
            ['Diseño con navaja',      'Trazo y diseño personalizado.',              60, 35000],
            ['Afeitado tradicional',   'Toallas calientes + navaja + bálsamo.',      45, 28000],
            ['Coloración',             'Tinte profesional para cabello o barba.',    90, 55000],
            ['Tratamiento capilar',    'Hidratación y masaje capilar.',              40, 22000],
            ['Corte de niño',          'Especial para menores de 12 años.',          35, 18000],
        ];
        $services = collect();
        foreach ($serviceData as $i => [$name, $desc, $duration, $price]) {
            $s = Service::updateOrCreate(
                ['tenant_id' => $tenant->id, 'name' => $name],
                [
                    'description'      => $desc,
                    'duration_minutes' => $duration,
                    'price_cents'      => $price,
                    'currency'         => 'MXN',
                    'is_active'        => true,
                    'display_order'    => $i,
                ]
            );
            $services->push($s);
        }

        // Asocia todos los servicios a todos los barberos
        foreach ($barbers as $b) {
            $b->services()->sync(
                $services->mapWithKeys(fn ($s) => [$s->id => ['tenant_id' => $tenant->id]])->all()
            );
        }

        // Productos
        $productData = [
            ['Pomada Mate Pro', 'POM-001', 32000, 12000, 24, 5],
            ['Aceite para barba', 'OIL-001', 28000, 9000, 18, 5],
            ['Shampoo cabello graso', 'SH-001', 24000, 8000, 30, 8],
            ['Cera fijación fuerte', 'WAX-001', 35000, 14000, 12, 4],
            ['Bálsamo para barba', 'BLM-001', 26000, 9500, 20, 5],
            ['Tijeras profesionales', 'TIJ-001', 89000, 50000, 4, 1],
            ['Gel para cabello rizado', 'GEL-001', 22000, 7000, 25, 6],
            ['Crema afeitar premium', 'CRM-001', 31000, 11000, 15, 4],
            ['Loción aftershave', 'AFT-001', 38000, 13000, 10, 3],
            ['Cepillo madera', 'CEP-001', 18000, 5000, 22, 5],
            ['Talco neutralizante', 'TLC-001', 12000, 3500, 40, 10],
            ['Set regalo barbero', 'SET-001', 145000, 70000, 6, 2],
        ];
        foreach ($productData as [$name, $sku, $price, $cost, $stock, $stockMin]) {
            Product::updateOrCreate(
                ['tenant_id' => $tenant->id, 'sku' => $sku],
                [
                    'name'        => $name,
                    'description' => "Producto premium {$name}.",
                    'price_cents' => $price,
                    'cost_cents'  => $cost,
                    'currency'    => 'MXN',
                    'stock'       => $stock,
                    'stock_min'   => $stockMin,
                    'is_active'   => true,
                ]
            );
        }

        // Clientes
        Appointment::where('tenant_id', $tenant->id)->delete();
        User::where('tenant_id', $tenant->id)->where('role', User::ROLE_CLIENT)->delete();

        $clients = collect();
        for ($i = 1; $i <= 50; $i++) {
            $lastVisit = match (true) {
                $i % 7 === 0 => now()->subDays(rand(45, 120)),       // inactivos
                $i % 5 === 0 => null,                                // nunca volvió
                default      => now()->subDays(rand(0, 25)),
            };
            $clients->push(User::create([
                'tenant_id'     => $tenant->id,
                'name'          => "Cliente Demo {$i}",
                'email'         => "cliente{$i}@elnavajazo.test",
                'phone'         => '+52155' . str_pad((string) (10000 + $i), 8, '0', STR_PAD_LEFT),
                'role'          => User::ROLE_CLIENT,
                'password'      => bcrypt(Str::random(20)),
                'last_visit_at' => $lastVisit,
            ]));
        }

        // Citas: 30 distribuidas entre ayer y +7 días
        $statuses = [
            AppointmentStatus::Confirmed,
            AppointmentStatus::Confirmed,
            AppointmentStatus::Confirmed,
            AppointmentStatus::PendingConfirmation,
            AppointmentStatus::Completed,
            AppointmentStatus::Cancelled,
        ];

        $apptCount = 0;
        $tries = 0;
        while ($apptCount < 30 && $tries < 200) {
            $tries++;
            $barber  = $barbers->random();
            $service = $services->random();
            $client  = $clients->random();
            $offsetHours = rand(-24, 7 * 24);
            $startsAt = CarbonImmutable::now($tenant->timezone)
                ->addHours($offsetHours)
                ->setMinute(0)
                ->setSecond(0);

            // Solo en horario 10-19 y días abiertos
            if ($startsAt->hour < 10 || $startsAt->hour > 19) continue;
            $weekday = $startsAt->dayOfWeek;
            if (in_array($weekday, [0, 1], true)) continue;

            $endsAt = $startsAt->addMinutes($service->duration_minutes);

            // Evita conflictos básicos
            $conflict = Appointment::where('barber_id', $barber->id)
                ->where('starts_at', $startsAt)
                ->exists();
            if ($conflict) continue;

            $status = $statuses[array_rand($statuses)];
            $deposit = (int) round($service->price_cents * 0.30);

            $appt = Appointment::create([
                'tenant_id'      => $tenant->id,
                'barber_id'      => $barber->id,
                'service_id'     => $service->id,
                'client_id'      => $client->id,
                'starts_at'      => $startsAt,
                'ends_at'        => $endsAt,
                'status'         => $status,
                'price_cents'    => $service->price_cents,
                'deposit_cents'  => $deposit,
                'deposit_status' => $status === AppointmentStatus::Cancelled ? 'forfeited' : 'captured',
                'source'         => 'client_web',
                'confirmed_at'   => $status === AppointmentStatus::Confirmed ? now() : null,
            ]);

            if ($status === AppointmentStatus::Completed || $status === AppointmentStatus::Confirmed) {
                Payment::create([
                    'tenant_id'      => $tenant->id,
                    'client_id'      => $client->id,
                    'appointment_id' => $appt->id,
                    'purpose'        => 'deposit',
                    'amount_cents'   => $deposit,
                    'currency'       => 'MXN',
                    'provider'       => 'stripe',
                    'provider_charge_id' => 'ch_demo_' . Str::random(20),
                    'status'         => 'succeeded',
                ]);
            }

            $apptCount++;
        }

        $this->command->info("[DemoTenantSeeder] Tenant '{$tenant->slug}' creado con {$apptCount} citas, " . $clients->count() . " clientes, " . $barbers->count() . ' barberos.');
        $this->command->info("[DemoTenantSeeder] Login admin: admin@elnavajazo.test / password");
        $this->command->info("[DemoTenantSeeder] URL pública: http://localhost:3000/b/{$tenant->slug}");
    }
}

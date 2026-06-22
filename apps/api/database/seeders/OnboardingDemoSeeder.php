<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Identity\Models\User;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Tenant fresh con admin que NUNCA ha entrado: sirve para demostrar el
 * wizard de onboarding (first_login_at = null → modal bloqueante).
 */
class OnboardingDemoSeeder extends Seeder
{
    public function run(): void
    {
        $plan = Plan::where('code', 'starter')->firstOrFail();

        $tenant = Tenant::updateOrCreate(
            ['slug' => 'marfil-avenue'],
            [
                'id'              => (string) Str::uuid(),
                'name'            => 'Barbería Marfil Avenue',
                'owner_email'     => 'admin@marfil.test',
                'plan_id'         => $plan->id,
                'plan_status'     => 'trial',
                'trial_ends_at'   => now()->addDays(15),
                'timezone'        => 'America/Mexico_City',
                'phone'           => null,
                'whatsapp_number' => null,
                'address'         => 'Polanco, CDMX',
                'cover_image_url' => null,
                'logo_url'        => null,
                'settings'        => ['deposit_pct' => 30, 'currency' => 'MXN'],
            ]
        );

        // Admin que NO ha completado onboarding — first_login_at = null
        User::updateOrCreate(
            ['email' => 'admin@marfil.test'],
            [
                'tenant_id'      => $tenant->id,
                'name'           => 'Sin nombre',
                'phone'          => null,
                'role'           => User::ROLE_ADMIN,
                'password'       => bcrypt('password'),
                'first_login_at' => null, // ← clave: fuerza wizard
            ]
        );

        $this->command->info("[OnboardingDemoSeeder] Tenant '{$tenant->slug}' listo (sin onboarding).");
        $this->command->info("[OnboardingDemoSeeder] Login: admin@marfil.test / password → /admin/{$tenant->slug}/onboarding");
    }
}

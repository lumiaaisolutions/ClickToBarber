<?php

declare(strict_types=1);

namespace App\Domain\Billing\Actions;

use App\Domain\Billing\Models\MagicLink;
use App\Domain\Billing\Models\Subscription;
use App\Domain\Identity\Models\User;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\Models\Tenant;
use App\Mail\OnboardingMagicLink;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Provisión idempotente de tenant tras un pago exitoso.
 *
 * Si ya existe un tenant para ese stripe_customer_id (caso reintentos
 * de webhook), no se crea otro: se actualiza estado y devuelve el existente.
 */
final class ProvisionTenant
{
    /**
     * @param array{
     *   email: string,
     *   business_name: string,
     *   plan_slug: string,
     *   billing_cycle: string,
     *   stripe_customer_id?: string,
     *   stripe_subscription_id?: string,
     * } $data
     */
    public function execute(array $data): Tenant
    {
        return DB::transaction(function () use ($data) {
            // Idempotencia: ¿ya existe esta suscripción de Stripe?
            if (! empty($data['stripe_subscription_id'])) {
                $existing = Subscription::query()
                    ->where('stripe_subscription_id', $data['stripe_subscription_id'])
                    ->first();

                if ($existing) {
                    return Tenant::query()->withoutGlobalScopes()->findOrFail($existing->tenant_id);
                }
            }

            $plan = Plan::query()->where('code', $data['plan_slug'])->firstOrFail();

            $slug = $this->uniqueSlug($data['business_name']);

            // HasUuids trait genera el id automáticamente; no lo pasamos para no
            // requerir 'id' en $fillable.
            $tenant = Tenant::query()->create([
                'slug'        => $slug,
                'name'        => $data['business_name'],
                'owner_email' => strtolower($data['email']),
                'plan_id'     => $plan->id,
                'plan_status' => 'active',
                'timezone'    => 'America/Mexico_City',
                'settings'    => ['onboarded_via' => 'stripe_checkout'],
            ]);

            // Password ilegible (32 chars random) — el usuario nunca la usa,
            // entra por magic link. Cuando cambie su password real, se
            // valida con StrongPassword (min 10 + mixed + numbers + symbols).
            $admin = User::query()->create([
                'tenant_id'      => $tenant->id,
                'name'           => $data['business_name'] . ' Admin',
                'email'          => strtolower($data['email']),
                'role'           => User::ROLE_ADMIN,
                'password'       => bcrypt(Str::random(32)),
                'first_login_at' => null,                     // dispara wizard
            ]);

            Subscription::query()->create([
                'tenant_id'              => $tenant->id,
                'plan_id'                => $plan->id,
                'status'                 => Subscription::STATUS_ACTIVE,
                'billing_cycle'          => $data['billing_cycle'] === 'yearly' ? 'yearly' : 'monthly',
                'stripe_customer_id'     => $data['stripe_customer_id'] ?? null,
                'stripe_subscription_id' => $data['stripe_subscription_id'] ?? null,
                'current_period_starts_at' => now(),
                'current_period_ends_at'   => $data['billing_cycle'] === 'yearly'
                    ? now()->addYear()
                    : now()->addMonth(),
            ]);

            // Magic link de onboarding (24h por defecto)
            [$link, $plain] = MagicLink::issue(
                $admin,
                MagicLink::PURPOSE_ONBOARDING,
                (int) config('security.magic_links.ttl_minutes', 1440),
            );

            // Send email — el Mailable es no-op en tests/dev (driver=log)
            try {
                Mail::to($admin->email)->queue(new OnboardingMagicLink($admin, $tenant, $plain));
            } catch (\Throwable $e) {
                logger()->warning('OnboardingMagicLink mail no enviado', [
                    'reason' => $e->getMessage(),
                    'user'   => $admin->id,
                ]);
            }

            logger()->info('Tenant provisionado', [
                'tenant'  => $tenant->id,
                'admin'   => $admin->id,
                'plan'    => $plan->code,
                'cycle'   => $data['billing_cycle'],
            ]);

            return $tenant;
        });
    }

    private function uniqueSlug(string $businessName): string
    {
        $base = Str::slug($businessName) ?: 'barberia';
        $slug = $base;
        $i = 2;
        while (Tenant::query()->withoutGlobalScopes()->where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }

        return $slug;
    }
}

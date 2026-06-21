<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tablas de billing y operación de webhooks:
 *  - subscriptions: una por tenant + provider, mantiene status y ciclo.
 *  - webhook_events: idempotencia para reentregas (Stripe/Meta/Twilio).
 *  - magic_links: tokens single-use para onboarding y recuperación.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id');
            $table->foreignId('plan_id')->constrained('plans');
            $table->string('status')->default('active'); // active, trialing, past_due, canceled, incomplete
            $table->string('billing_cycle')->default('monthly'); // monthly, yearly
            $table->string('stripe_customer_id')->nullable()->index();
            $table->string('stripe_subscription_id')->nullable()->unique();
            $table->string('mercadopago_subscription_id')->nullable()->unique();
            $table->timestamp('current_period_starts_at')->nullable();
            $table->timestamp('current_period_ends_at')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'status']);
        });

        Schema::create('webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 32);              // stripe, meta, twilio
            $table->string('event_id')->index();         // ID único del proveedor
            $table->string('event_type')->nullable();
            $table->json('payload');
            $table->timestamp('received_at')->useCurrent();
            $table->timestamp('processed_at')->nullable();
            $table->string('status', 16)->default('pending'); // pending, processed, failed, skipped
            $table->text('error')->nullable();

            // Idempotencia: un mismo (provider, event_id) no se procesa dos veces.
            $table->unique(['provider', 'event_id']);
        });

        Schema::create('magic_links', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();  // sha256 hex
            $table->string('purpose', 32);               // onboarding, password_reset
            $table->timestamp('expires_at')->index();
            $table->timestamp('used_at')->nullable();
            $table->string('ip_used', 45)->nullable();
            $table->timestamps();
        });

        // owner_email → nullable porque ProvisionTenant lo setea con el del checkout
        // y los seeders demo no siempre lo definen.
        if (Schema::hasColumn('tenants', 'owner_email')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->string('owner_email')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('magic_links');
        Schema::dropIfExists('webhook_events');
        Schema::dropIfExists('subscriptions');
    }
};

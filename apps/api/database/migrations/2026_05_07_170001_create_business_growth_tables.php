<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Membresías del cliente final (pre-pago mensual con servicios incluidos).
        Schema::create('memberships', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->string('name');
            $table->unsignedInteger('price_cents');
            $table->string('currency', 3)->default('MXN');
            $table->unsignedTinyInteger('included_services_per_month');
            $table->json('eligible_service_ids')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Suscripción del cliente a una membresía.
        Schema::create('client_memberships', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('membership_id')->constrained('memberships')->cascadeOnDelete();
            $table->unsignedTinyInteger('services_used_this_period')->default(0);
            $table->date('current_period_starts_on');
            $table->date('current_period_ends_on');
            $table->string('status', 16)->default('active');
            $table->string('stripe_subscription_id')->nullable();
            $table->timestamps();
        });

        // Gift cards.
        Schema::create('gift_cards', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->string('code', 24)->unique();
            $table->unsignedInteger('value_cents');
            $table->unsignedInteger('balance_cents');
            $table->string('currency', 3)->default('MXN');
            $table->foreignId('purchaser_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('recipient_email')->nullable();
            $table->string('recipient_name')->nullable();
            $table->text('message')->nullable();
            $table->timestamp('redeemed_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        // Programa de afiliados (B2B): refiere otra barbería → comisión.
        Schema::create('affiliates', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('name');
            $table->string('code', 16)->unique();
            $table->unsignedTinyInteger('commission_pct')->default(30);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('affiliate_referrals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('affiliate_id')->constrained('affiliates')->cascadeOnDelete();
            $table->uuid('tenant_id')->index();
            $table->unsignedInteger('mrr_cents_at_signup')->nullable();
            $table->unsignedInteger('total_commission_paid_cents')->default(0);
            $table->timestamp('signed_up_at')->useCurrent();
            $table->timestamps();
        });

        // CFDI 4.0 — registro de comprobantes emitidos.
        Schema::create('cfdi_invoices', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->string('rfc_emisor', 13);
            $table->string('rfc_receptor', 13);
            $table->string('uso_cfdi', 10);
            $table->string('uuid_sat', 40)->nullable();
            $table->unsignedInteger('subtotal_cents');
            $table->unsignedInteger('iva_cents')->default(0);
            $table->unsignedInteger('total_cents');
            $table->string('status', 24)->default('draft'); // draft, stamped, cancelled
            $table->string('xml_path', 300)->nullable();
            $table->string('pdf_path', 300)->nullable();
            $table->json('pac_response')->nullable();
            $table->timestamp('stamped_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cfdi_invoices');
        Schema::dropIfExists('affiliate_referrals');
        Schema::dropIfExists('affiliates');
        Schema::dropIfExists('gift_cards');
        Schema::dropIfExists('client_memberships');
        Schema::dropIfExists('memberships');
    }
};

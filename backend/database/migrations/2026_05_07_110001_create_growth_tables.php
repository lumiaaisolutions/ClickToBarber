<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bloque B: programa de referidos + loyalty.
 *
 *  - referrals: cliente referidor → email referido + código único trazable.
 *  - loyalty_programs: configuración por tenant (cada N visitas → recompensa).
 *  - loyalty_visits: contador atómico de visitas válidas por cliente.
 *  - loyalty_rewards: recompensas emitidas (estado redimida/no, expira, ...).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referrals', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('referrer_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('referred_email')->nullable();
            $table->string('code', 16)->unique();          // human-friendly: NAVA-XJ4Q
            $table->string('status', 20)->default('pending'); // pending, signed_up, completed, expired
            $table->unsignedInteger('reward_referrer_cents')->default(15000); // crédito al referidor
            $table->unsignedInteger('reward_referred_cents')->default(10000); // descuento al nuevo
            $table->foreignId('referred_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('first_appointment_id')->nullable();
            $table->timestamp('signed_up_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });

        Schema::create('loyalty_programs', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->unique();             // 1 por tenant
            $table->boolean('is_active')->default(false);
            $table->unsignedTinyInteger('every_n_visits')->default(10);
            $table->string('reward_type', 16)->default('discount_pct'); // discount_pct | free_service
            $table->unsignedTinyInteger('reward_value')->default(100);  // 100% o pct
            $table->string('reward_label')->nullable();
            $table->unsignedSmallInteger('expiry_days')->default(180);
            $table->timestamps();
        });

        Schema::create('loyalty_visits', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('appointment_id')->constrained('appointments')->cascadeOnDelete();
            $table->timestamp('credited_at')->useCurrent();

            $table->unique('appointment_id');
            $table->index(['tenant_id', 'user_id']);
        });

        Schema::create('loyalty_rewards', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('code', 16)->unique();
            $table->string('reward_type', 16);
            $table->unsignedTinyInteger('reward_value');
            $table->string('reward_label')->nullable();
            $table->timestamp('issued_at')->useCurrent();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('redeemed_at')->nullable();
            $table->foreignId('redeemed_appointment_id')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'user_id', 'redeemed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_rewards');
        Schema::dropIfExists('loyalty_visits');
        Schema::dropIfExists('loyalty_programs');
        Schema::dropIfExists('referrals');
    }
};

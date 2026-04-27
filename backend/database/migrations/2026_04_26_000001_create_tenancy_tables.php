<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Plans (globales, sin tenant)
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();           // free, starter, pro, enterprise
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('price_cents')->default(0);
            $table->string('currency', 3)->default('MXN');
            $table->json('features');                   // ["multi_barbers","whatsapp",...]
            $table->unsignedInteger('max_barbers')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Tenants (barberías)
        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('owner_email');
            $table->foreignId('plan_id')->constrained('plans');
            $table->string('plan_status')->default('active'); // active, past_due, cancelled, trial
            $table->timestamp('trial_ends_at')->nullable();
            $table->json('settings')->nullable();             // moneda, idioma, % depósito
            $table->string('timezone')->default('America/Mexico_City');
            $table->string('phone')->nullable();
            $table->string('whatsapp_number')->nullable();
            $table->text('address')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('cover_image_url')->nullable();
            $table->string('logo_url')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
        Schema::dropIfExists('plans');
    }
};

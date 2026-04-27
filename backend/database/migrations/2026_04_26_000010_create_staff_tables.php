<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barbers', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('avatar_url')->nullable();
            $table->text('bio')->nullable();
            $table->json('specialties')->nullable();           // ["fade","barba","diseño"]
            $table->unsignedInteger('default_slot_minutes')->default(45);
            $table->unsignedTinyInteger('commission_pct')->default(40);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('display_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        // Horario semanal del barbero (0=Dom .. 6=Sáb)
        Schema::create('barber_shifts', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('barber_id')->constrained('barbers')->cascadeOnDelete();
            $table->unsignedTinyInteger('weekday'); // 0..6
            $table->time('start_time');
            $table->time('end_time');
            $table->timestamps();
        });

        // Horario semanal de la sucursal
        Schema::create('business_hours', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->unsignedTinyInteger('weekday');
            $table->time('open_time');
            $table->time('close_time');
            $table->boolean('is_closed')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_hours');
        Schema::dropIfExists('barber_shifts');
        Schema::dropIfExists('barbers');
    }
};

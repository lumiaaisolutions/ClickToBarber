<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Operación avanzada:
 *   - walk_in_queue: clientes que llegan sin cita.
 *   - appointment_recurrences: regla de repetición de citas.
 *   - tip_splits: distribución de propinas multi-barbero.
 *   - in_app_notifications: notificaciones in-app del admin.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('walk_in_queue', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->string('client_name');
            $table->string('client_phone')->nullable();
            $table->foreignId('barber_id')->nullable()->constrained('barbers')->nullOnDelete();
            $table->foreignId('service_id')->nullable()->constrained('services')->nullOnDelete();
            $table->string('status', 16)->default('waiting'); // waiting, in_progress, served, abandoned
            $table->unsignedSmallInteger('estimated_minutes')->nullable();
            $table->timestamp('arrived_at')->useCurrent();
            $table->timestamp('called_at')->nullable();
            $table->timestamp('served_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status', 'arrived_at']);
        });

        Schema::create('appointment_recurrences', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('barber_id')->constrained('barbers')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->string('frequency', 16);              // weekly, biweekly, monthly
            $table->unsignedTinyInteger('weekday')->nullable();   // 0-6
            $table->unsignedTinyInteger('day_of_month')->nullable(); // 1-28
            $table->time('time_local');
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->timestamp('last_materialized_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('tip_splits', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->foreignId('barber_id')->constrained('barbers')->cascadeOnDelete();
            $table->unsignedInteger('amount_cents');
            $table->date('earned_on');
            $table->timestamps();

            $table->index(['tenant_id', 'earned_on']);
        });

        Schema::create('in_app_notifications', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->nullable()->index();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 32);
            $table->string('title', 200);
            $table->text('body')->nullable();
            $table->string('url', 500)->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'read_at']);
        });

        // Free trial: añadimos trial_ends_at a tenants (si no existe).
        if (! Schema::hasColumn('tenants', 'trial_ends_at')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->timestamp('trial_ends_at')->nullable()->after('plan_status');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('in_app_notifications');
        Schema::dropIfExists('tip_splits');
        Schema::dropIfExists('appointment_recurrences');
        Schema::dropIfExists('walk_in_queue');
    }
};

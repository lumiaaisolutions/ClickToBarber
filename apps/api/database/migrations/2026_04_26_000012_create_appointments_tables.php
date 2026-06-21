<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('barber_id')->constrained('barbers')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->dateTime('starts_at')->index();
            $table->dateTime('ends_at');
            $table->string('status')->default('pending_confirmation');
            // pending_confirmation, confirmed, in_progress, completed, cancelled, no_show
            $table->unsignedInteger('price_cents');
            $table->unsignedInteger('deposit_cents')->default(0);
            $table->string('deposit_status')->default('pending'); // pending, captured, refunded, forfeited
            $table->string('source')->default('client_web');      // client_web, admin_manual, walk_in
            $table->text('notes')->nullable();
            $table->dateTime('reminder_sent_at')->nullable();
            $table->dateTime('confirmed_at')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->string('cancelled_by')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();

            // Evita doble booking del mismo barbero en el mismo slot
            $table->unique(['barber_id', 'starts_at']);
        });

        Schema::create('appointment_status_history', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('appointment_id')->constrained('appointments')->cascadeOnDelete();
            $table->string('from_status')->nullable();
            $table->string('to_status');
            $table->string('actor')->nullable();      // user:42, system, job:autocancel
            $table->json('context')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_status_history');
        Schema::dropIfExists('appointments');
    }
};

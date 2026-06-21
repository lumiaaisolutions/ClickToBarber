<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ratings — uno por cita (UNIQUE), público vía token de un solo uso.
        Schema::create('ratings', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('appointment_id')->constrained('appointments')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('barber_id')->nullable()->constrained('barbers')->nullOnDelete();
            $table->unsignedTinyInteger('stars'); // 1..5
            $table->string('comment', 500)->nullable();
            $table->string('public_token', 64)->unique();
            $table->timestamp('submitted_at')->nullable();
            $table->boolean('is_published')->default(true);
            $table->timestamps();

            $table->unique('appointment_id');
            $table->index(['tenant_id', 'submitted_at']);
            $table->index(['barber_id', 'submitted_at']);
        });

        // Web Push subscriptions (cliente y admin).
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->nullable()->index();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('endpoint', 1000);
            $table->string('p256dh_key', 200);
            $table->string('auth_key', 100);
            $table->string('user_agent', 300)->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'endpoint'], 'push_user_endpoint_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
        Schema::dropIfExists('ratings');
    }
};

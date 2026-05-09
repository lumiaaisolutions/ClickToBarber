<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_connections', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('provider', 24);                 // google, outlook (futuro)
            $table->text('access_token');                   // cifrado vía cast
            $table->text('refresh_token')->nullable();      // cifrado vía cast
            $table->timestamp('access_token_expires_at')->nullable();
            $table->string('account_email')->nullable();
            $table->string('calendar_id', 200)->nullable();
            $table->string('scope', 500)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'provider']);
        });

        Schema::create('calendar_external_events', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('appointment_id')->constrained('appointments')->cascadeOnDelete();
            $table->foreignId('calendar_connection_id')->constrained('calendar_connections')->cascadeOnDelete();
            $table->string('external_id', 200);             // event id en Google Calendar
            $table->timestamp('synced_at')->useCurrent();

            $table->unique(['calendar_connection_id', 'appointment_id']);
        });

        // ical_feed_token: cada barbero puede tener un feed iCal con token único.
        Schema::table('barbers', function (Blueprint $table) {
            $table->string('ical_feed_token', 64)->nullable()->unique()->after('display_order');
        });
    }

    public function down(): void
    {
        Schema::table('barbers', function (Blueprint $table) {
            $table->dropColumn('ical_feed_token');
        });
        Schema::dropIfExists('calendar_external_events');
        Schema::dropIfExists('calendar_connections');
    }
};

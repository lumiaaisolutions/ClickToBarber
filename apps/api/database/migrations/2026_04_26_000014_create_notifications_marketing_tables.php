<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications_log', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->string('channel');             // whatsapp, email, voice
            $table->string('template');            // appointment_confirmed, reminder_24h, ...
            $table->string('to_address');          // teléfono o email
            $table->string('status');              // queued, sent, failed, deferred
            $table->text('payload')->nullable();
            $table->text('response')->nullable();
            $table->dateTime('sent_at')->nullable();
            $table->timestamps();
        });

        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->string('name');
            $table->string('type')->default('retention'); // retention, promo, broadcast
            $table->json('segment_filter')->nullable();   // ["last_visit_days_gte:30"]
            $table->string('channel')->default('whatsapp');
            $table->text('template_body');
            $table->string('coupon_code')->nullable();
            $table->unsignedInteger('discount_pct')->nullable();
            $table->dateTime('scheduled_at')->nullable();
            $table->dateTime('sent_at')->nullable();
            $table->unsignedInteger('recipients_count')->default(0);
            $table->unsignedInteger('opened_count')->default(0);
            $table->unsignedInteger('redeemed_count')->default(0);
            $table->string('status')->default('draft'); // draft, scheduled, sending, sent, failed
            $table->timestamps();
        });

        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('campaign_id')->nullable()->constrained('campaigns')->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('code')->unique();
            $table->unsignedInteger('discount_pct')->nullable();
            $table->unsignedInteger('discount_cents')->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->dateTime('redeemed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupons');
        Schema::dropIfExists('campaigns');
        Schema::dropIfExists('notifications_log');
    }
};

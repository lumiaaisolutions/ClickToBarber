<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->string('purpose');                 // deposit, service, product, tip, refund
            $table->unsignedInteger('amount_cents');
            $table->string('currency', 3)->default('MXN');
            $table->string('provider');                // stripe, mercadopago, cash, terminal
            $table->string('provider_charge_id')->nullable();
            $table->string('status')->default('pending'); // pending, succeeded, failed, refunded
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->foreignId('barber_id')->nullable()->constrained('barbers')->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('subtotal_cents');
            $table->unsignedInteger('tip_cents')->default(0);
            $table->unsignedInteger('discount_cents')->default(0);
            $table->unsignedInteger('total_cents');
            $table->string('payment_method');           // cash, card, transfer, terminal
            $table->string('status')->default('open'); // open, paid, void
            $table->dateTime('closed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('ticket_items', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->string('item_type');                // service, product
            $table->unsignedBigInteger('item_id');
            $table->string('item_name');
            $table->unsignedInteger('quantity')->default(1);
            $table->unsignedInteger('unit_price_cents');
            $table->unsignedInteger('total_cents');
            $table->timestamps();
        });

        Schema::create('cash_closes', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('barber_id')->nullable()->constrained('barbers')->nullOnDelete();
            $table->date('business_date');
            $table->unsignedInteger('total_cash_cents')->default(0);
            $table->unsignedInteger('total_card_cents')->default(0);
            $table->unsignedInteger('total_transfer_cents')->default(0);
            $table->unsignedInteger('total_tips_cents')->default(0);
            $table->unsignedInteger('commission_cents')->default(0);
            $table->unsignedInteger('total_cents')->default(0);
            $table->dateTime('closed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_closes');
        Schema::dropIfExists('ticket_items');
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('payments');
    }
};

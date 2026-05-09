<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extiende tickets/cash_closes con campos faltantes y añade trial_ends_at
 * a subscriptions para free trial 14 días.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (! Schema::hasColumn('tickets', 'payment_method')) $table->string('payment_method', 16)->default('cash')->after('total_cents');
            if (! Schema::hasColumn('tickets', 'coupon_id'))      $table->foreignId('coupon_id')->nullable()->after('payment_method');
        });

        Schema::table('cash_closes', function (Blueprint $table) {
            if (! Schema::hasColumn('cash_closes', 'gross_cents'))         $table->unsignedInteger('gross_cents')->default(0);
            if (! Schema::hasColumn('cash_closes', 'cash_expected_cents')) $table->unsignedInteger('cash_expected_cents')->default(0);
            if (! Schema::hasColumn('cash_closes', 'cash_declared_cents')) $table->unsignedInteger('cash_declared_cents')->default(0);
            if (! Schema::hasColumn('cash_closes', 'variance_cents'))      $table->integer('variance_cents')->default(0);
            if (! Schema::hasColumn('cash_closes', 'commission_cents'))    $table->unsignedInteger('commission_cents')->default(0);
            if (! Schema::hasColumn('cash_closes', 'tips_cents'))          $table->unsignedInteger('tips_cents')->default(0);
            if (! Schema::hasColumn('cash_closes', 'notes'))               $table->text('notes')->nullable();
            if (! Schema::hasColumn('cash_closes', 'closed_by_user_id'))   $table->foreignId('closed_by_user_id')->nullable();
            if (! Schema::hasColumn('cash_closes', 'closed_at'))           $table->timestamp('closed_at')->nullable();
            if (! Schema::hasColumn('cash_closes', 'date'))                $table->date('date')->nullable();
        });

        Schema::table('payments', function (Blueprint $table) {
            if (! Schema::hasColumn('payments', 'ticket_id')) {
                $table->foreignId('ticket_id')->nullable()->after('appointment_id');
            }
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            if (! Schema::hasColumn('subscriptions', 'trial_ends_at')) {
                $table->timestamp('trial_ends_at')->nullable()->after('billing_cycle');
            }
        });
    }

    public function down(): void {}
};

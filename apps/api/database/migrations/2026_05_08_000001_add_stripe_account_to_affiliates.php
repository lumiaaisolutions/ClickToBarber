<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('affiliates', function (Blueprint $table) {
            $table->string('stripe_account_id', 64)->nullable()->after('commission_pct');
            $table->boolean('stripe_payouts_enabled')->default(false)->after('stripe_account_id');
        });

        Schema::table('affiliate_referrals', function (Blueprint $table) {
            $table->timestamp('last_paid_at')->nullable()->after('total_commission_paid_cents');
        });
    }

    public function down(): void
    {
        Schema::table('affiliate_referrals', function (Blueprint $table) {
            $table->dropColumn('last_paid_at');
        });
        Schema::table('affiliates', function (Blueprint $table) {
            $table->dropColumn(['stripe_account_id', 'stripe_payouts_enabled']);
        });
    }
};

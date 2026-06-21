<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bloque A: hardening operativo.
 *
 *  - users.two_factor_*: TOTP RFC 6238 secret + códigos de recuperación.
 *  - user_login_events: historial de logins para detección de anomalías.
 *  - audit_logs: quién cambió qué, cuándo y desde dónde.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('two_factor_secret')->nullable()->after('password');
            $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
            $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');
        });

        Schema::create('user_login_events', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->nullable()->index();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent_hash', 64)->nullable()->index();
            $table->string('user_agent', 500)->nullable();
            $table->string('country', 2)->nullable();
            $table->string('result', 20);            // success, failed, twofa_required, twofa_failed
            $table->boolean('alert_sent')->default(false);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'created_at']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->nullable()->index();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_email')->nullable();   // snapshot por si el user se borra
            $table->string('action', 32);                 // created, updated, deleted, login, ...
            $table->string('subject_type', 80);           // FQCN del modelo afectado
            $table->string('subject_id', 64);             // id (puede ser uuid)
            $table->json('changes')->nullable();          // {before:{}, after:{}, ...}
            $table->string('ip_address', 45)->nullable();
            $table->string('request_id', 36)->nullable()->index();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['tenant_id', 'subject_type', 'subject_id']);
            $table->index(['tenant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('user_login_events');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at']);
        });
    }
};

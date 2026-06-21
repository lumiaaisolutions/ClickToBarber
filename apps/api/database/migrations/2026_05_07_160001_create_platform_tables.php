<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Plataforma: API keys, webhooks salientes, PII access log, galería de cortes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_keys', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->string('name');
            $table->string('prefix', 12)->unique();        // los primeros 12 chars (lk_xxx)
            $table->string('hash', 64);                    // sha256 del token completo
            $table->json('scopes');                        // ['appointments:read','...']
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('outbound_webhooks', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->string('url', 500);
            $table->json('events');                        // ['appointment.confirmed','rating.submitted', ...]
            $table->string('secret', 64);                  // para que el receptor verifique HMAC
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_success_at')->nullable();
            $table->timestamp('last_failure_at')->nullable();
            $table->unsignedSmallInteger('consecutive_failures')->default(0);
            $table->timestamps();
        });

        Schema::create('outbound_webhook_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('webhook_id')->constrained('outbound_webhooks')->cascadeOnDelete();
            $table->string('event_type', 80);
            $table->json('payload');
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->text('response_body')->nullable();
            $table->unsignedTinyInteger('attempt')->default(1);
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('next_retry_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['webhook_id', 'created_at']);
        });

        Schema::create('pii_access_log', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->nullable()->index();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('endpoint');
            $table->string('subject_type', 80)->nullable();
            $table->string('subject_id', 64)->nullable();
            $table->unsignedSmallInteger('row_count')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['tenant_id', 'created_at']);
        });

        Schema::create('cut_gallery', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->foreignId('barber_id')->constrained('barbers')->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('before_url', 500)->nullable();
            $table->string('after_url', 500);
            $table->string('caption', 200)->nullable();
            $table->boolean('client_consent')->default(false);
            $table->timestamp('consent_at')->nullable();
            $table->timestamp('expires_at')->nullable();   // por defecto +180 días sin consent permanente
            $table->boolean('is_published')->default(false);
            $table->timestamps();

            $table->index(['tenant_id', 'is_published', 'created_at']);
        });

        // Tenant-level enforcement de 2FA y password policies.
        if (! Schema::hasColumn('tenants', 'security')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->json('security')->nullable()->after('settings');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('cut_gallery');
        Schema::dropIfExists('pii_access_log');
        Schema::dropIfExists('outbound_webhook_deliveries');
        Schema::dropIfExists('outbound_webhooks');
        Schema::dropIfExists('api_keys');
    }
};

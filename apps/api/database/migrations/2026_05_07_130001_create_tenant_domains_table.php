<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Custom domains por tenant (white-label completo).
 *
 *  - host:               nombre canónico (sin protocolo, ej. reservas.barberia.com).
 *  - verification_token: lo que la barbería pone en un TXT DNS (_lumia-verify).
 *  - verified_at:        cuando el chequeo DNS encuentra el TXT esperado.
 *  - is_primary:         se usa como default para emails y links de share.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_domains', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->index();
            $table->string('host')->unique();
            $table->string('verification_token', 64);
            $table->timestamp('verified_at')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_domains');
    }
};

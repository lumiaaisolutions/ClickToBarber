<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cifrado PII en clientes finales (role=client) y campos de notas.
 *
 * Estrategia:
 *   - Convertir `phone` a TEXT para que admita el blob cifrado (Laravel Crypt
 *     genera ciphertext largo; un VARCHAR(255) puede quedarse corto).
 *   - Añadir `phone_hash` (sha256 hex) indexable para lookups por teléfono.
 *   - Añadir `notes` (TEXT) cifrado en reposo.
 *
 * El cast `encrypted` de Laravel hace el resto a nivel de modelo. Los datos
 * existentes deben re-seedearse (`migrate:fresh --seed`); en producción
 * primero se exportan, luego se aplica esta migración y un comando de
 * re-cifrado escribe los valores. Como aún no hay datos productivos,
 * esto es seguro hoy.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Cambiamos phone a TEXT (más espacio para ciphertext)
        Schema::table('users', function (Blueprint $table) {
            $table->text('phone')->nullable()->change();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('phone_hash', 64)->nullable()->after('phone');
            $table->text('notes')->nullable()->after('preferences');
        });

        // Índice separado para no exceder los 64 char límites de algunas DBs en composite
        Schema::table('users', function (Blueprint $table) {
            $table->index(['tenant_id', 'phone_hash'], 'users_tenant_phone_hash_idx');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_tenant_phone_hash_idx');
            $table->dropColumn(['phone_hash', 'notes']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 255)->nullable()->change();
        });
    }
};

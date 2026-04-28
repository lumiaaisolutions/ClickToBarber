<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * tenant_branding — identidad visual por barbería.
 *
 * Es 1-1 con tenants. Los valores aquí alimentan el <BrandingProvider>
 * del frontend, que inyecta CSS variables al subtree /admin/{slug}/* y
 * /b/{slug}/* sin contaminar otras sesiones (cada provider scopea su
 * propio --tenant-* via :where([data-tenant=slug])).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_branding', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->unique();

            // Preset escogido en el wizard inicial. Sirve como semilla y
            // permite "resetear a preset" en el futuro.
            $table->string('preset', 32)->default('old-money-emerald');

            // Tokens de identidad
            $table->string('primary_color', 7)->default('#1F3D2B');   // verde botella
            $table->string('accent_color', 7)->default('#B8935E');    // oro mate
            $table->string('font_display', 64)->default('Cormorant Garamond');
            $table->string('font_body',    64)->default('Inter Tight');
            $table->string('radius',       16)->default('soft');         // sharp / soft / round
            $table->string('density',      16)->default('comfortable');  // compact / comfortable / airy
            $table->string('mode',         16)->default('light');        // light / sepia / dark

            // Activos
            $table->string('logo_url',     512)->nullable();
            $table->string('cover_url',    512)->nullable();

            // Metadatos editables por el admin
            $table->string('admin_display_name', 128)->nullable();
            $table->string('public_tagline',     255)->nullable();

            // Para experimentación futura sin migrar
            $table->json('extra')->nullable();

            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')->on('tenants')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_branding');
    }
};

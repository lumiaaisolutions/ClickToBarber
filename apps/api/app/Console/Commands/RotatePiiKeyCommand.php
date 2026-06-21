<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Identity\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Crypt;

/**
 * Re-encripta columnas PII tras rotar APP_KEY.
 *
 * Procedimiento operativo (ver docs/SECRETS_RUNBOOK.md):
 *   1. Generar nueva key con `php artisan key:generate --show`.
 *   2. Setear `APP_PREVIOUS_KEYS=<old-key>` en gestor.
 *   3. Promover la nueva como `APP_KEY`.
 *   4. Correr este comando: `php artisan lumia:rotate-pii-key`.
 *   5. Tras 24h sin errores, borrar `APP_PREVIOUS_KEYS`.
 *
 * El cast `encrypted` de Laravel intenta automáticamente las claves
 * listadas en APP_PREVIOUS_KEYS para descifrar valores legacy. Este
 * comando los lee y vuelve a guardar para que queden con la nueva key.
 *
 *   php artisan lumia:rotate-pii-key [--dry-run]
 */
final class RotatePiiKeyCommand extends Command
{
    protected $signature = 'lumia:rotate-pii-key {--dry-run}';
    protected $description = 'Re-cifra users.phone y users.notes con la APP_KEY actual';

    public function handle(): int
    {
        $isDry = (bool) $this->option('dry-run');
        $count = 0;

        User::query()
            ->withoutGlobalScopes()
            ->whereNotNull('phone')
            ->orWhereNotNull('notes')
            ->chunkById(200, function ($users) use (&$count, $isDry) {
                foreach ($users as $user) {
                    try {
                        $phone = $user->phone;     // descifrado por cast (intenta APP_PREVIOUS_KEYS)
                        $notes = $user->notes;
                    } catch (\Throwable $e) {
                        $this->warn("user {$user->id} no se pudo descifrar: {$e->getMessage()}");
                        continue;
                    }

                    if (! $isDry) {
                        // El save vuelve a cifrar con la APP_KEY activa.
                        $user->forceFill(['phone' => $phone, 'notes' => $notes])->saveQuietly();
                    }
                    $count++;
                }
            });

        $this->info(($isDry ? '[DRY] ' : '') . "{$count} user(s) procesados.");
        return self::SUCCESS;
    }
}

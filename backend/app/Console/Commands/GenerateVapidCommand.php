<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * Genera un keypair VAPID P-256.
 *
 *   php artisan lumia:generate-vapid
 *
 * Imprime VAPID_PUBLIC_KEY (base64url) y VAPID_PRIVATE_KEY (PEM EC).
 * Copiar ambos al gestor de secrets.
 */
final class GenerateVapidCommand extends Command
{
    protected $signature = 'lumia:generate-vapid';
    protected $description = 'Genera un keypair VAPID (curve P-256) para Web Push';

    public function handle(): int
    {
        $key = openssl_pkey_new([
            'curve_name'       => 'prime256v1',
            'private_key_type' => OPENSSL_KEYTYPE_EC,
        ]);
        if (! $key) {
            $this->error('openssl no soporta P-256');
            return self::FAILURE;
        }

        $pubBin = "\x04" . openssl_pkey_get_details($key)['ec']['x']
                . openssl_pkey_get_details($key)['ec']['y'];
        openssl_pkey_export($key, $privPem);

        $b64url = rtrim(strtr(base64_encode($pubBin), '+/', '-_'), '=');

        $this->line('');
        $this->info('VAPID_PUBLIC_KEY=');
        $this->line($b64url);
        $this->line('');
        $this->info('VAPID_PRIVATE_KEY=');
        $this->line(trim($privPem));
        $this->line('');
        $this->comment('Pega ambos en tu gestor de secrets (Doppler / AWS SM).');

        return self::SUCCESS;
    }
}

<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Engagement\Services\SendPushNotification;
use Illuminate\Console\Command;

/**
 * Manda una notificación de prueba a un user.
 *   php artisan lumia:push-test {user_id}
 */
final class PushTestCommand extends Command
{
    protected $signature = 'lumia:push-test {user : ID del user destinatario}';
    protected $description = 'Envía un Web Push de prueba a las subscriptions del user';

    public function handle(SendPushNotification $push): int
    {
        $userId = (int) $this->argument('user');

        $count = $push->toUser($userId, [
            'title' => 'LUMIA · prueba',
            'body'  => 'Si ves esto, Web Push está funcionando 🎉',
            'url'   => '/admin',
            'tag'   => 'test-push',
        ]);

        $this->info("Push enviado a {$count} suscripción(es).");
        return self::SUCCESS;
    }
}

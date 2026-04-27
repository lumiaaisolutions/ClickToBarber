<?php

declare(strict_types=1);

namespace App\Infrastructure\Integrations\MetaWhatsapp;

use App\Domain\Notifications\Contracts\WhatsappClient;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Driver mock para desarrollo: solo registra el envío.
 * En producción, reemplazar por MetaCloudWhatsappClient (HTTP a graph.facebook.com).
 */
final class LogWhatsappClient implements WhatsappClient
{
    public function send(string $to, string $template, array $params = []): array
    {
        $id = 'wamid.MOCK.' . Str::random(20);
        Log::channel('single')->info('[WhatsApp/MOCK] Enviado', [
            'id'       => $id,
            'to'       => $to,
            'template' => $template,
            'params'   => $params,
        ]);

        return ['id' => $id, 'status' => 'sent'];
    }
}

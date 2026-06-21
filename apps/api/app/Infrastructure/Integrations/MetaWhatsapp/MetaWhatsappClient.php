<?php

declare(strict_types=1);

namespace App\Infrastructure\Integrations\MetaWhatsapp;

use App\Domain\Notifications\Contracts\WhatsappClient;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Cliente real de WhatsApp Cloud API (Meta Graph).
 *
 * Endpoint: https://graph.facebook.com/{version}/{phone_id}/messages
 *
 * Las plantillas que recibe (parámetro `$template`) deben coincidir con
 * los nombres aprobados por Meta. El mapeo del nombre interno a Meta vive
 * en config/services.php → meta_whatsapp.templates.
 *
 * Los parámetros se inyectan como variables {{1}}, {{2}}, ... en el cuerpo
 * de la plantilla, en el orden en que aparecen en el array.
 */
final class MetaWhatsappClient implements WhatsappClient
{
    public function send(string $to, string $template, array $params = []): array
    {
        $cfg = config('services.meta_whatsapp');
        $phoneId = (string) ($cfg['phone_id'] ?? '');
        $token   = (string) ($cfg['token'] ?? '');
        $version = (string) ($cfg['api_version'] ?? 'v20.0');

        if ($phoneId === '' || $token === '') {
            throw new RuntimeException('Meta WhatsApp credentials missing — set WHATSAPP_PHONE_ID and WHATSAPP_TOKEN');
        }

        // Mapea nombre interno → nombre aprobado por Meta
        $metaTemplate = $cfg['templates'][$template] ?? $template;

        $payload = [
            'messaging_product' => 'whatsapp',
            'to'                => $this->normalizeNumber($to),
            'type'              => 'template',
            'template'          => [
                'name'     => $metaTemplate,
                'language' => ['code' => 'es_MX'],
                'components' => $this->buildComponents($params),
            ],
        ];

        $response = Http::withToken($token)
            ->acceptJson()
            ->asJson()
            ->timeout(8)
            ->post("https://graph.facebook.com/{$version}/{$phoneId}/messages", $payload);

        if ($response->failed()) {
            throw new RuntimeException(
                'Meta WhatsApp send failed: ' . $response->status() . ' ' . substr($response->body(), 0, 500),
            );
        }

        $data = $response->json();
        $id = (string) ($data['messages'][0]['id'] ?? 'unknown');

        return ['id' => $id, 'status' => 'sent'];
    }

    /**
     * Construye el array `components` esperado por Meta:
     * [{ type: "body", parameters: [{type:"text", text: "..."}, ...] }]
     *
     * Si no hay parámetros, devuelve array vacío (la plantilla se envía sin variables).
     */
    private function buildComponents(array $params): array
    {
        if ($params === []) {
            return [];
        }

        return [[
            'type' => 'body',
            'parameters' => array_map(
                static fn ($v) => ['type' => 'text', 'text' => (string) $v],
                array_values($params),
            ),
        ]];
    }

    /** Quita espacios, guiones, paréntesis. Conserva el "+" inicial si existe. */
    private function normalizeNumber(string $phone): string
    {
        $clean = preg_replace('/[^0-9+]/', '', $phone) ?? '';

        return ltrim($clean, '+');
    }
}

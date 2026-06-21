<?php

declare(strict_types=1);

namespace App\Infrastructure\Integrations\Twilio;

use App\Domain\Notifications\Contracts\VoiceClient;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Cliente Twilio Voice — POST a https://api.twilio.com/2010-04-01/Accounts/{Sid}/Calls.json
 *
 * Driver controlado por config('services.twilio.driver'):
 *  - "log" (default dev) → solo loggea, no llama. Útil sin keys.
 *  - "twilio"            → llama de verdad usando TwiML inline (Twiml.Say).
 *
 * El TwiML se sirve inline por el parámetro `Twiml=` evitando exponer un
 * endpoint propio. Locale TTS por defecto: es-MX (Polly.Mia / Lupe).
 */
final class TwilioVoiceClient implements VoiceClient
{
    private const API = 'https://api.twilio.com/2010-04-01';

    public function call(string $to, string $say): array
    {
        $cfg = config('services.twilio');
        $driver = (string) ($cfg['driver'] ?? 'log');

        if ($driver === 'log' || ! ($cfg['sid'] ?? null) || ! ($cfg['token'] ?? null) || ! ($cfg['from'] ?? null)) {
            Log::info('[Twilio/log] voice call (no real send)', ['to' => $to, 'say' => $say]);
            return ['id' => 'twilio_log_' . substr(md5($to . $say . microtime(true)), 0, 16), 'status' => 'logged'];
        }

        $sid   = (string) $cfg['sid'];
        $token = (string) $cfg['token'];
        $from  = (string) $cfg['from'];

        $twiml = $this->buildTwiml($say);

        $response = Http::asForm()
            ->withBasicAuth($sid, $token)
            ->post(self::API . "/Accounts/{$sid}/Calls.json", [
                'From'  => $from,
                'To'    => $to,
                'Twiml' => $twiml,
                'Timeout' => 25,
                'MachineDetection' => 'Enable',
            ]);

        if ($response->failed()) {
            Log::error('Twilio voice call failed', ['body' => $response->body()]);
            throw new RuntimeException('Twilio call failed: ' . $response->body());
        }

        $body = $response->json();
        return [
            'id'     => (string) ($body['sid'] ?? ''),
            'status' => (string) ($body['status'] ?? 'queued'),
        ];
    }

    private function buildTwiml(string $say): string
    {
        $clean = htmlspecialchars($say, ENT_XML1 | ENT_QUOTES, 'UTF-8');
        return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Mia" language="es-MX">{$clean}</Say>
  <Pause length="1"/>
  <Say voice="Polly.Mia" language="es-MX">{$clean}</Say>
</Response>
XML;
    }
}

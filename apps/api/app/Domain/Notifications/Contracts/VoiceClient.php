<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Contracts;

interface VoiceClient
{
    /**
     * Inicia una llamada saliente que reproduce un mensaje de voz.
     *
     * @param  string  $to    E.164: "+5215512345678"
     * @param  string  $say   Texto a leer por TTS (locale es-MX por defecto)
     * @return array{id:string,status:string}
     */
    public function call(string $to, string $say): array;
}

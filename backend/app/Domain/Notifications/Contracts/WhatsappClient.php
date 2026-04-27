<?php

declare(strict_types=1);

namespace App\Domain\Notifications\Contracts;

interface WhatsappClient
{
    /**
     * @param  array<string,mixed>  $template  parámetros para Meta Cloud API
     * @return array{id:string,status:string}
     */
    public function send(string $to, string $template, array $params = []): array;
}

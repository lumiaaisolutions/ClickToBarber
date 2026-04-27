<?php

declare(strict_types=1);

namespace App\Domain\Payments\Contracts;

interface PaymentGateway
{
    /**
     * @return array{charge_id:string,status:'succeeded'|'failed'|'pending',raw:array<string,mixed>}
     */
    public function charge(int $amountCents, string $currency, string $description, array $meta = []): array;

    public function refund(string $chargeId, ?int $amountCents = null): array;
}

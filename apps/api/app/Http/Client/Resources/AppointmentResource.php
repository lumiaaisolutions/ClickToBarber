<?php

declare(strict_types=1);

namespace App\Http\Client\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

final class AppointmentResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'             => $this->id,
            'starts_at'      => $this->starts_at->toIso8601String(),
            'ends_at'        => $this->ends_at->toIso8601String(),
            'status'         => $this->status->value,
            'status_label'   => $this->status->label(),
            'price_cents'    => $this->price_cents,
            'deposit_cents'  => $this->deposit_cents,
            'deposit_status' => $this->deposit_status,
            'barber'         => [
                'id'   => $this->barber->id,
                'name' => $this->barber->name,
            ],
            'service' => [
                'id'   => $this->service->id,
                'name' => $this->service->name,
            ],
            'client' => [
                'id'    => $this->client->id,
                'name'  => $this->client->name,
                'email' => $this->client->email,
            ],
        ];
    }
}

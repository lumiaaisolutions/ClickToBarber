<?php

declare(strict_types=1);

namespace App\Http\Client\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

final class ServicePublicResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'               => $this->id,
            'name'             => $this->name,
            'description'      => $this->description,
            'duration_minutes' => $this->duration_minutes,
            'price_cents'      => $this->price_cents,
            'price_formatted'  => '$' . number_format($this->price_cents / 100, 2) . ' ' . $this->currency,
            'image'            => $this->image_url,
        ];
    }
}

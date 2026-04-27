<?php

declare(strict_types=1);

namespace App\Http\Client\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

final class BarberPublicResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'avatar'      => $this->avatar_url,
            'specialties' => $this->specialties ?? [],
            'bio'         => $this->bio,
        ];
    }
}

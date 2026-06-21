<?php

declare(strict_types=1);

namespace App\Http\Client\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

final class PublicTenantResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'             => $this->id,
            'slug'           => $this->slug,
            'name'           => $this->name,
            'phone'          => $this->phone,
            'whatsapp'       => $this->whatsapp_number,
            'address'        => $this->address,
            'cover_image'    => $this->cover_image_url,
            'logo'           => $this->logo_url,
            'timezone'       => $this->timezone,
            'deposit_pct'    => $this->depositPercentage(),
            'plan'           => [
                'code' => $this->plan?->code,
                'name' => $this->plan?->name,
            ],
        ];
    }
}

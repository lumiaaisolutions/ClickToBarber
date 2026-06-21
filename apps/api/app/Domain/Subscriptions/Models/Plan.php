<?php

declare(strict_types=1);

namespace App\Domain\Subscriptions\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'code', 'name', 'description', 'price_cents', 'currency',
        'features', 'max_barbers', 'sort_order', 'is_active',
    ];

    protected $casts = [
        'features'    => 'array',
        'is_active'   => 'boolean',
        'price_cents' => 'integer',
        'max_barbers' => 'integer',
        'sort_order'  => 'integer',
    ];

    public function hasFeature(string $feature): bool
    {
        return in_array($feature, $this->features ?? [], true);
    }

    public function priceFormatted(): string
    {
        return number_format($this->price_cents / 100, 2) . ' ' . $this->currency;
    }
}

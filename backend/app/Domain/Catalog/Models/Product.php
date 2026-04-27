<?php

declare(strict_types=1);

namespace App\Domain\Catalog\Models;

use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'name', 'sku', 'description', 'price_cents', 'cost_cents',
        'currency', 'image_url', 'stock', 'stock_min', 'is_active',
    ];

    protected $casts = [
        'is_active'   => 'boolean',
        'price_cents' => 'integer',
        'cost_cents'  => 'integer',
        'stock'       => 'integer',
        'stock_min'   => 'integer',
    ];

    public function isLowStock(): bool
    {
        return $this->stock <= $this->stock_min;
    }
}

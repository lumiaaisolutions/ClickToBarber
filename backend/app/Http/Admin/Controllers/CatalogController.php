<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Catalog\Models\Product;
use App\Domain\Catalog\Models\Service;

final class CatalogController
{
    public function services()
    {
        return Service::orderBy('display_order')->get()->map(fn ($s) => [
            'id'               => $s->id,
            'name'             => $s->name,
            'description'      => $s->description,
            'duration_minutes' => $s->duration_minutes,
            'price_cents'      => $s->price_cents,
            'currency'         => $s->currency,
            'is_active'        => $s->is_active,
        ]);
    }

    public function products()
    {
        return Product::orderBy('name')->get()->map(fn ($p) => [
            'id'          => $p->id,
            'name'        => $p->name,
            'sku'         => $p->sku,
            'price_cents' => $p->price_cents,
            'currency'    => $p->currency,
            'stock'       => $p->stock,
            'stock_min'   => $p->stock_min,
            'low_stock'   => $p->isLowStock(),
            'is_active'   => $p->is_active,
        ]);
    }
}

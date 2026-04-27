<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Subscriptions\Models\Plan;

final class PlanCatalogController
{
    public function __invoke()
    {
        return Plan::where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Plan $p) => [
                'code'        => $p->code,
                'name'        => $p->name,
                'description' => $p->description,
                'price_cents' => $p->price_cents,
                'price'       => $p->priceFormatted(),
                'features'    => $p->features,
                'max_barbers' => $p->max_barbers,
            ]);
    }
}

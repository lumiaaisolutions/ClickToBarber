<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Catalog\Models\Product;
use App\Domain\Catalog\Models\Service;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CatalogController extends Controller
{
    // ===== Services =====

    public function services(): JsonResponse
    {
        return response()->json(
            Service::orderBy('display_order')->get()->map(fn (Service $s) => $this->serializeService($s))
        );
    }

    public function storeService(Request $request): JsonResponse
    {
        $this->guardWrite($request);

        $data = $request->validate([
            'name'             => ['required', 'string', 'max:128'],
            'description'      => ['nullable', 'string', 'max:500'],
            'duration_minutes' => ['required', 'integer', 'min:10', 'max:240'],
            'price_cents'      => ['required', 'integer', 'min:0'],
            'currency'         => ['nullable', 'string', 'size:3'],
            'image_url'        => ['nullable', 'url', 'max:512'],
            'is_active'        => ['nullable', 'boolean'],
            'display_order'    => ['nullable', 'integer', 'min:0'],
        ]);

        $service = Service::create([
            ...$data,
            'currency'      => $data['currency'] ?? 'MXN',
            'is_active'     => $data['is_active'] ?? true,
            'display_order' => $data['display_order'] ?? 0,
        ]);

        return response()->json(['data' => $this->serializeService($service)], 201);
    }

    public function updateService(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);
        $service = Service::findOrFail($id);

        $data = $request->validate([
            'name'             => ['nullable', 'string', 'max:128'],
            'description'      => ['nullable', 'string', 'max:500'],
            'duration_minutes' => ['nullable', 'integer', 'min:10', 'max:240'],
            'price_cents'      => ['nullable', 'integer', 'min:0'],
            'currency'         => ['nullable', 'string', 'size:3'],
            'image_url'        => ['nullable', 'url', 'max:512'],
            'is_active'        => ['nullable', 'boolean'],
            'display_order'    => ['nullable', 'integer', 'min:0'],
        ]);

        $service->fill(array_filter($data, fn ($v) => $v !== null));
        $service->save();

        return response()->json(['data' => $this->serializeService($service)]);
    }

    public function destroyService(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);
        $service = Service::findOrFail($id);
        $service->delete();

        return response()->json(['ok' => true]);
    }

    // ===== Products =====

    public function products(): JsonResponse
    {
        return response()->json(
            Product::orderBy('name')->get()->map(fn (Product $p) => $this->serializeProduct($p))
        );
    }

    public function storeProduct(Request $request): JsonResponse
    {
        $this->guardWrite($request);

        $data = $request->validate([
            'name'        => ['required', 'string', 'max:128'],
            'sku'         => ['required', 'string', 'max:64'],
            'description' => ['nullable', 'string', 'max:500'],
            'price_cents' => ['required', 'integer', 'min:0'],
            'cost_cents'  => ['nullable', 'integer', 'min:0'],
            'currency'    => ['nullable', 'string', 'size:3'],
            'stock'       => ['nullable', 'integer', 'min:0'],
            'stock_min'   => ['nullable', 'integer', 'min:0'],
            'is_active'   => ['nullable', 'boolean'],
        ]);

        $product = Product::create([
            ...$data,
            'currency'  => $data['currency'] ?? 'MXN',
            'stock'     => $data['stock'] ?? 0,
            'stock_min' => $data['stock_min'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json(['data' => $this->serializeProduct($product)], 201);
    }

    public function updateProduct(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);
        $product = Product::findOrFail($id);

        $data = $request->validate([
            'name'        => ['nullable', 'string', 'max:128'],
            'sku'         => ['nullable', 'string', 'max:64'],
            'description' => ['nullable', 'string', 'max:500'],
            'price_cents' => ['nullable', 'integer', 'min:0'],
            'cost_cents'  => ['nullable', 'integer', 'min:0'],
            'currency'    => ['nullable', 'string', 'size:3'],
            'stock'       => ['nullable', 'integer', 'min:0'],
            'stock_min'   => ['nullable', 'integer', 'min:0'],
            'is_active'   => ['nullable', 'boolean'],
        ]);

        $product->fill(array_filter($data, fn ($v) => $v !== null));
        $product->save();

        return response()->json(['data' => $this->serializeProduct($product)]);
    }

    public function destroyProduct(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);
        $product = Product::findOrFail($id);
        $product->delete();

        return response()->json(['ok' => true]);
    }

    // ----- helpers -----

    private function guardWrite(Request $request): void
    {
        $user = $request->user();
        if (! $user || ! $user->canWrite()) {
            abort(response()->json(['error' => 'role_forbidden'], 403));
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeService(Service $s): array
    {
        return [
            'id'               => $s->id,
            'name'             => $s->name,
            'description'      => $s->description,
            'duration_minutes' => $s->duration_minutes,
            'price_cents'      => $s->price_cents,
            'currency'         => $s->currency,
            'image_url'        => $s->image_url,
            'is_active'        => $s->is_active,
            'display_order'    => $s->display_order,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeProduct(Product $p): array
    {
        return [
            'id'          => $p->id,
            'name'        => $p->name,
            'sku'         => $p->sku,
            'description' => $p->description,
            'price_cents' => $p->price_cents,
            'cost_cents'  => $p->cost_cents,
            'currency'    => $p->currency,
            'stock'       => $p->stock,
            'stock_min'   => $p->stock_min,
            'low_stock'   => method_exists($p, 'isLowStock') ? $p->isLowStock() : ($p->stock <= $p->stock_min),
            'is_active'   => $p->is_active,
        ];
    }
}

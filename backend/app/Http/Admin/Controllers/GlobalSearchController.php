<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Catalog\Models\Product;
use App\Domain\Catalog\Models\Service;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /api/admin/search?q=...
 * Búsqueda global ligera en clientes, servicios y productos del tenant.
 * Usado por el Cmd+K del frontend.
 */
final class GlobalSearchController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function __invoke(Request $request): JsonResponse
    {
        $tenant = $this->current->require();
        $q = trim((string) $request->query('q', ''));
        if ($q === '' || strlen($q) < 2) {
            return response()->json(['results' => []]);
        }

        $like = "%{$q}%";

        $clients = User::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('role', User::ROLE_CLIENT)
            ->where(function ($w) use ($like) {
                $w->where('name', 'like', $like)->orWhere('email', 'like', $like);
            })
            ->limit(5)
            ->get(['id', 'name', 'email'])
            ->map(fn ($u) => [
                'kind'  => 'client',
                'label' => $u->name,
                'sub'   => $u->email,
                'href'  => "/admin/clients/{$u->id}",
            ]);

        $services = Service::query()
            ->where('tenant_id', $tenant->id)
            ->where('name', 'like', $like)
            ->limit(5)
            ->get(['id', 'name'])
            ->map(fn ($s) => [
                'kind'  => 'service',
                'label' => $s->name,
                'sub'   => 'Servicio',
                'href'  => "/admin/services",
            ]);

        $products = Product::query()
            ->where('tenant_id', $tenant->id)
            ->where(function ($w) use ($like) {
                $w->where('name', 'like', $like)->orWhere('sku', 'like', $like);
            })
            ->limit(5)
            ->get(['id', 'name', 'sku'])
            ->map(fn ($p) => [
                'kind'  => 'product',
                'label' => $p->name,
                'sub'   => $p->sku,
                'href'  => "/admin/pos",
            ]);

        return response()->json([
            'results' => $clients->concat($services)->concat($products)->values(),
        ]);
    }
}

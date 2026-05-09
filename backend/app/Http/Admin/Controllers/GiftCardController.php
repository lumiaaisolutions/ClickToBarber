<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Memberships\Models\GiftCard;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class GiftCardController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function index(): JsonResponse
    {
        $tenant = $this->current->require();
        $cards = GiftCard::query()->where('tenant_id', $tenant->id)
            ->orderByDesc('id')->limit(200)->get();

        return response()->json($cards);
    }

    public function store(Request $request): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();

        $data = $request->validate([
            'value_cents'     => ['required', 'integer', 'min:1'],
            'recipient_email' => ['nullable', 'email', 'max:255'],
            'recipient_name'  => ['nullable', 'string', 'max:120'],
            'message'         => ['nullable', 'string', 'max:500'],
            'expires_in_days' => ['nullable', 'integer', 'min:30', 'max:730'],
        ]);

        $gc = GiftCard::create([
            'tenant_id'       => $tenant->id,
            'code'            => GiftCard::newCode(),
            'value_cents'     => $data['value_cents'],
            'balance_cents'   => $data['value_cents'],
            'currency'        => 'MXN',
            'recipient_email' => $data['recipient_email'] ?? null,
            'recipient_name'  => $data['recipient_name'] ?? null,
            'message'         => $data['message'] ?? null,
            'expires_at'      => now()->addDays($data['expires_in_days'] ?? 365),
        ]);

        return response()->json($gc, 201);
    }

    public function lookup(Request $request, string $code): JsonResponse
    {
        $tenant = $this->current->require();
        $gc = GiftCard::query()->where('tenant_id', $tenant->id)->where('code', $code)->first();
        if (! $gc) return response()->json(['error' => 'not_found'], 404);

        return response()->json([
            'code'          => $gc->code,
            'value_cents'   => $gc->value_cents,
            'balance_cents' => $gc->balance_cents,
            'usable'        => $gc->isUsable(),
            'expires_at'    => $gc->expires_at?->toIso8601String(),
        ]);
    }

    private function guardWrite(Request $request): void
    {
        $u = $request->user();
        if (! $u || ! $u->canWrite()) abort(response()->json(['error' => 'role_forbidden'], 403));
    }
}

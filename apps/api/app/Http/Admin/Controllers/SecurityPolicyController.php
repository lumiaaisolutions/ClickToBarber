<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET / PUT /api/admin/security/policy
 * Permite al admin del tenant configurar enforcement de seguridad.
 */
final class SecurityPolicyController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function show(): JsonResponse
    {
        $tenant = $this->current->require();
        return response()->json($tenant->security ?? [
            'require_2fa' => false,
            'session_idle_minutes' => 120,
            'password_policy' => 'strong',
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $u = $request->user();
        if (! $u || ! $u->isAdmin()) abort(response()->json(['error' => 'admin_only'], 403));

        $data = $request->validate([
            'require_2fa'           => ['nullable', 'boolean'],
            'session_idle_minutes'  => ['nullable', 'integer', 'min:5', 'max:43200'],
            'password_policy'       => ['nullable', 'string', 'in:basic,strong'],
        ]);

        $tenant = $this->current->require();
        $tenant->forceFill([
            'security' => array_merge((array) ($tenant->security ?? []), array_filter($data, fn ($v) => $v !== null)),
        ])->save();

        return response()->json($tenant->fresh()->security);
    }
}

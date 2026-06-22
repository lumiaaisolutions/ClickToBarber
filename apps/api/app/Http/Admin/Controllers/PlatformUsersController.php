<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Identity\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class PlatformUsersController extends Controller
{
    /** GET /api/admin/superadmin/users */
    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->whereIn('role', User::PORTAL_ROLES)
            ->where('role', '!=', User::ROLE_CLIENT);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($tenantId = $request->input('tenant_id')) {
            $query->where('tenant_id', $tenantId);
        }

        $users = $query->orderByDesc('created_at')->paginate(25);

        return response()->json([
            'data' => $users->getCollection()->map(fn (User $u) => [
                'id'           => $u->id,
                'name'         => $u->name,
                'email'        => $u->email,
                'role'         => $u->role,
                'tenant_id'    => $u->tenant_id,
                'created_at'   => $u->created_at->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'total'        => $users->total(),
            ],
        ]);
    }

    /** PATCH /api/admin/superadmin/users/{id} */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name'  => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'role'  => ['sometimes', Rule::in(User::PORTAL_ROLES)],
        ]);

        $user->update($validated);

        return response()->json(['user' => [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'role'  => $user->role,
        ]]);
    }
}

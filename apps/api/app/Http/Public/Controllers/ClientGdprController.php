<?php

declare(strict_types=1);

namespace App\Http\Public\Controllers;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Billing\Models\MagicLink;
use App\Domain\Engagement\Models\Rating;
use App\Domain\Growth\Models\LoyaltyReward;
use App\Domain\Identity\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GDPR / LFPDPPP para el cliente final (NO solo admin).
 *
 *  POST /api/public/me/data-export    { token } → JSON descargable.
 *  POST /api/public/me/data-deletion  { token, confirm } → anonimiza al user.
 *
 * Token = magic link `client_portal` activo.
 */
final class ClientGdprController extends Controller
{
    public function export(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $appointments = Appointment::query()
            ->withoutGlobalScopes()
            ->where('client_id', $user->id)
            ->get(['id', 'tenant_id', 'starts_at', 'ends_at', 'status', 'price_cents', 'deposit_cents'])
            ->toArray();

        $ratings = Rating::query()
            ->withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->get(['stars', 'comment', 'submitted_at'])
            ->toArray();

        $rewards = LoyaltyReward::query()
            ->withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->get()->toArray();

        return response()->json([
            'export_at' => now()->toIso8601String(),
            'me' => [
                'id'     => $user->id,
                'name'   => $user->name,
                'email'  => $user->email,
                'phone'  => $user->phone, // descifrado por cast del modelo
            ],
            'appointments' => $appointments,
            'ratings'      => $ratings,
            'rewards'      => $rewards,
        ])->header(
            'Content-Disposition',
            'attachment; filename="lumia-mis-datos-' . now()->format('Y-m-d') . '.json"',
        );
    }

    public function delete(Request $request): JsonResponse
    {
        $request->validate([
            'token'   => ['required', 'string'],
            'confirm' => ['required', 'string', 'in:DELETE'],
        ]);

        $user = $this->resolveUser($request);

        $user->forceFill([
            'name'  => 'Cliente eliminado',
            'email' => 'deleted-' . $user->id . '@anonymized.invalid',
            'phone' => null,
            'notes' => null,
        ])->save();
        $user->delete();

        return response()->json(['ok' => true, 'anonymized' => true]);
    }

    private function resolveUser(Request $request): User
    {
        $request->validate(['token' => ['required', 'string', 'min:32']]);

        $link = MagicLink::findValidByToken($request->input('token'), 'client_portal');
        if (! $link) {
            abort(response()->json(['error' => 'invalid_or_expired'], 410));
        }

        return User::query()->withoutGlobalScopes()->findOrFail($link->user_id);
    }
}

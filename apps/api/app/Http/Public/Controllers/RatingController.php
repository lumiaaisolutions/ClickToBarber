<?php

declare(strict_types=1);

namespace App\Http\Public\Controllers;

use App\Domain\Engagement\Models\Rating;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoints públicos para calificar una cita post-visita.
 *
 *  GET  /api/public/ratings/{token} → estado actual (info para hidratar la UI).
 *  POST /api/public/ratings/{token} → envía rating (1-5 + comentario opcional).
 */
final class RatingController extends Controller
{
    public function show(string $token): JsonResponse
    {
        $rating = Rating::query()
            ->withoutGlobalScopes()
            ->where('public_token', $token)
            ->with(['user:id,name', 'barber:id,name'])
            ->first();

        if (! $rating) {
            return response()->json(['error' => 'not_found'], 404);
        }

        return response()->json([
            'token'         => $rating->public_token,
            'submitted'     => (bool) $rating->submitted_at,
            'submitted_at'  => $rating->submitted_at?->toIso8601String(),
            'stars'         => $rating->stars,
            'barber_name'   => $rating->barber?->name,
            'client_first_name' => $rating->user?->name
                ? explode(' ', (string) $rating->user->name)[0]
                : null,
        ]);
    }

    public function store(Request $request, string $token): JsonResponse
    {
        $rating = Rating::query()
            ->withoutGlobalScopes()
            ->where('public_token', $token)
            ->first();

        if (! $rating) {
            return response()->json(['error' => 'not_found'], 404);
        }

        if ($rating->submitted_at) {
            return response()->json(['error' => 'already_submitted'], 410);
        }

        $data = $request->validate([
            'stars'   => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:500'],
        ]);

        $rating->forceFill([
            'stars'        => $data['stars'],
            'comment'      => $data['comment'] ?? null,
            'submitted_at' => now(),
            'is_published' => $data['stars'] >= 4, // sólo 4★+ se publican por defecto
        ])->save();

        return response()->json(['ok' => true]);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Identity\Models\User;
use App\Domain\Staff\Models\Barber;
use App\Domain\Staff\Models\BarberShift;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class StaffController extends Controller
{
    /**
     * GET /api/admin/staff — lista todos los barberos del tenant.
     * Cualquier rol del portal puede leer.
     */
    public function index(): JsonResponse
    {
        $barbers = Barber::with(['shifts', 'services'])
            ->orderBy('display_order')
            ->get()
            ->map(fn (Barber $b) => $this->serialize($b));

        return response()->json($barbers);
    }

    /**
     * POST /api/admin/staff — crea un barbero. Sólo admin/manager.
     */
    public function store(Request $request): JsonResponse
    {
        $this->guardWrite($request);

        $data = $request->validate([
            'name'                 => ['required', 'string', 'max:128'],
            'email'                => ['nullable', 'email', 'max:255'],
            'phone'                => ['nullable', 'string', 'max:32'],
            'avatar_url'           => ['nullable', 'url', 'max:512'],
            'bio'                  => ['nullable', 'string', 'max:500'],
            'specialties'          => ['nullable', 'array'],
            'specialties.*'        => ['string', 'max:48'],
            'default_slot_minutes' => ['nullable', 'integer', 'min:10', 'max:240'],
            'commission_pct'       => ['nullable', 'numeric', 'min:0', 'max:100'],
            'is_active'            => ['nullable', 'boolean'],
        ]);

        $barber = Barber::create([
            ...$data,
            'default_slot_minutes' => $data['default_slot_minutes'] ?? 45,
            'commission_pct'       => $data['commission_pct'] ?? 40,
            'is_active'            => $data['is_active'] ?? true,
            'specialties'          => $data['specialties'] ?? [],
        ]);

        return response()->json(['data' => $this->serialize($barber)], 201);
    }

    /**
     * PUT /api/admin/staff/{id} — actualiza barbero. Sólo admin/manager.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);

        $barber = Barber::findOrFail($id);

        $data = $request->validate([
            'name'                 => ['nullable', 'string', 'max:128'],
            'email'                => ['nullable', 'email', 'max:255'],
            'phone'                => ['nullable', 'string', 'max:32'],
            'avatar_url'           => ['nullable', 'url', 'max:512'],
            'bio'                  => ['nullable', 'string', 'max:500'],
            'specialties'          => ['nullable', 'array'],
            'specialties.*'        => ['string', 'max:48'],
            'default_slot_minutes' => ['nullable', 'integer', 'min:10', 'max:240'],
            'commission_pct'       => ['nullable', 'numeric', 'min:0', 'max:100'],
            'is_active'            => ['nullable', 'boolean'],
        ]);

        $barber->fill(array_filter($data, fn ($v) => $v !== null));
        $barber->save();

        return response()->json(['data' => $this->serialize($barber->fresh(['shifts', 'services']))]);
    }

    /**
     * DELETE /api/admin/staff/{id} — soft-delete del barbero. Sólo admin/manager.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);

        $barber = Barber::findOrFail($id);
        $barber->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * GET /api/admin/staff/me/schedule — el barbero autenticado lee sus turnos.
     * Si el rol es admin/manager, puede pasar ?barber_id=X explícito.
     */
    public function mySchedule(Request $request): JsonResponse
    {
        $user = $request->user();
        $barber = $this->resolveBarberForUser($user, $request);

        if (! $barber) {
            return response()->json(['error' => 'no_barber_profile'], 422);
        }

        return response()->json([
            'barber_id' => $barber->id,
            'barber_name' => $barber->name,
            'shifts' => BarberShift::where('barber_id', $barber->id)
                ->orderBy('weekday')
                ->orderBy('start_time')
                ->get()
                ->map(fn (BarberShift $s) => [
                    'id'      => $s->id,
                    'weekday' => $s->weekday,
                    'start'   => $s->start_time,
                    'end'     => $s->end_time,
                ]),
        ]);
    }

    /**
     * PUT /api/admin/staff/me/schedule — el barbero (o admin) reemplaza sus turnos.
     */
    public function updateMySchedule(Request $request): JsonResponse
    {
        $user = $request->user();
        $barber = $this->resolveBarberForUser($user, $request);

        if (! $barber) {
            return response()->json(['error' => 'no_barber_profile'], 422);
        }

        $data = $request->validate([
            'shifts'              => ['required', 'array'],
            'shifts.*.weekday'    => ['required', 'integer', 'between:0,6'],
            'shifts.*.start_time' => ['required', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'shifts.*.end_time'   => ['required', 'string', 'regex:/^\d{2}:\d{2}$/'],
        ]);

        BarberShift::where('barber_id', $barber->id)->delete();

        foreach ($data['shifts'] as $s) {
            BarberShift::create([
                'tenant_id'  => $barber->tenant_id,
                'barber_id'  => $barber->id,
                'weekday'    => $s['weekday'],
                'start_time' => $s['start_time'],
                'end_time'   => $s['end_time'],
            ]);
        }

        return response()->json(['ok' => true, 'count' => count($data['shifts'])]);
    }

    // ----- helpers -----

    private function guardWrite(Request $request): void
    {
        $user = $request->user();
        if (! $user || ! $user->canWrite()) {
            abort(response()->json(['error' => 'role_forbidden'], 403));
        }
    }

    private function resolveBarberForUser(?User $user, Request $request): ?Barber
    {
        if (! $user) return null;

        // Admin/manager: pueden pasar barber_id explícito
        if ($user->canWrite() && $request->filled('barber_id')) {
            return Barber::find((int) $request->input('barber_id'));
        }

        // Barbero: por email coincidente
        return Barber::where('email', $user->email)->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(Barber $b): array
    {
        return [
            'id'             => $b->id,
            'name'           => $b->name,
            'email'          => $b->email,
            'phone'          => $b->phone,
            'avatar'         => $b->avatar_url,
            'bio'            => $b->bio,
            'specialties'    => $b->specialties ?? [],
            'commission_pct' => $b->commission_pct,
            'default_slot_minutes' => $b->default_slot_minutes,
            'is_active'      => $b->is_active,
            'shifts'         => $b->relationLoaded('shifts')
                ? $b->shifts->map(fn ($s) => [
                    'id'      => $s->id,
                    'weekday' => $s->weekday,
                    'start'   => $s->start_time,
                    'end'     => $s->end_time,
                ])
                : [],
            'services_count' => $b->relationLoaded('services') ? $b->services->count() : 0,
        ];
    }
}

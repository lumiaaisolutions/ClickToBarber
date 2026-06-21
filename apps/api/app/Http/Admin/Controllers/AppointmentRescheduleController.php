<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\Repositories\Contracts\AppointmentRepository;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POST /api/admin/appointments/{id}/reschedule
 *   { starts_at, barber_id?: int }
 *
 * Mueve una cita a un nuevo slot. Verifica conflicto con
 * `existsConflict()`. Usado por el drag-drop del calendario semanal.
 */
final class AppointmentRescheduleController extends Controller
{
    public function __construct(
        private CurrentTenant $current,
        private AppointmentRepository $repo,
    ) {}

    public function __invoke(Request $request, int $id): JsonResponse
    {
        $u = $request->user();
        if (! $u || ! $u->canWrite()) abort(response()->json(['error' => 'role_forbidden'], 403));

        $tenant = $this->current->require();
        $appt = Appointment::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('id', $id)->firstOrFail();

        $data = $request->validate([
            'starts_at' => ['required', 'date', 'after:now'],
            'barber_id' => ['nullable', 'integer'],
        ]);

        $newStart = CarbonImmutable::parse($data['starts_at'], $tenant->timezone);
        $duration = $appt->starts_at->diffInMinutes($appt->ends_at);
        $newEnd = $newStart->addMinutes((int) $duration);
        $barberId = $data['barber_id'] ?? $appt->barber_id;

        if ($this->repo->existsConflict($barberId, $newStart, $newEnd)) {
            return response()->json(['error' => 'slot_taken'], 409);
        }

        $appt->forceFill([
            'starts_at' => $newStart,
            'ends_at'   => $newEnd,
            'barber_id' => $barberId,
        ])->save();

        return response()->json([
            'ok'        => true,
            'starts_at' => $appt->starts_at->toIso8601String(),
            'ends_at'   => $appt->ends_at->toIso8601String(),
        ]);
    }
}

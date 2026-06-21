<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Appointments\DTOs\BookAppointmentInput;
use App\Domain\Appointments\Services\BookAppointment;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POST /api/admin/appointments
 *
 * Permite al admin agendar manualmente una cita (walk-in / teléfono /
 * cliente que no usa el portal). Reusa el mismo `BookAppointment` que
 * el flujo público, así hereda lock optimista y pipeline anti-no-show.
 */
final class ManualAppointmentController extends Controller
{
    public function __construct(
        private CurrentTenant $current,
        private BookAppointment $book,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();

        $data = $request->validate([
            'barber_id'    => ['required', 'integer'],
            'service_id'   => ['required', 'integer'],
            'starts_at'    => ['required', 'date'],
            'client_name'  => ['required', 'string', 'max:120'],
            'client_email' => ['required', 'email', 'max:255'],
            'client_phone' => ['nullable', 'string', 'max:32'],
            'notes'        => ['nullable', 'string', 'max:500'],
        ]);

        $appt = $this->book->execute(new BookAppointmentInput(
            tenantId:    $tenant->id,
            barberId:    (int) $data['barber_id'],
            serviceId:   (int) $data['service_id'],
            clientName:  $data['client_name'],
            clientEmail: strtolower($data['client_email']),
            clientPhone: $data['client_phone'] ?? null,
            startsAt:    $data['starts_at'],
            notes:       $data['notes'] ?? null,
        ));

        // Marca origen distinto para distinguir manual vs cliente público.
        $appt->forceFill(['source' => 'admin_manual'])->save();

        return response()->json([
            'id'         => $appt->id,
            'starts_at'  => $appt->starts_at->toIso8601String(),
            'status'     => $appt->status->value,
            'price_cents' => $appt->price_cents,
        ], 201);
    }

    private function guardWrite(Request $request): void
    {
        $u = $request->user();
        // receptionist también puede crear citas manualmente
        $allowed = $u && in_array($u->role, ['admin', 'manager', 'receptionist', 'platform_owner'], true);
        if (! $allowed) {
            abort(response()->json(['error' => 'role_forbidden'], 403));
        }
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Appointments\Services\CancelAppointment;
use App\Domain\Appointments\Services\CompleteAppointment;
use App\Domain\Appointments\Services\ConfirmAppointment;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Transiciones de ciclo de vida de citas desde el portal admin.
 *
 *  POST /api/admin/appointments/{id}/complete
 *  POST /api/admin/appointments/{id}/cancel    body: {reason, forfeit_deposit?}
 *  POST /api/admin/appointments/{id}/confirm
 */
final class AppointmentLifecycleController extends Controller
{
    public function __construct(
        private CompleteAppointment $complete,
        private CancelAppointment $cancel,
        private ConfirmAppointment $confirm,
    ) {}

    public function complete(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);
        $appt = $this->complete->execute($id, 'admin:' . $request->user()->id);

        return response()->json(['ok' => true, 'status' => $appt->status->value]);
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);

        $data = $request->validate([
            'reason'           => ['required', 'string', 'max:200'],
            'forfeit_deposit'  => ['nullable', 'boolean'],
        ]);

        $appt = $this->cancel->execute(
            $id,
            $data['reason'],
            'admin:' . $request->user()->id,
            (bool) ($data['forfeit_deposit'] ?? false),
        );

        return response()->json(['ok' => true, 'status' => $appt->status->value]);
    }

    public function confirm(Request $request, int $id): JsonResponse
    {
        $this->guardWrite($request);
        $appt = $this->confirm->execute($id, 'admin:' . $request->user()->id);

        return response()->json(['ok' => true, 'status' => $appt->status->value]);
    }

    private function guardWrite(Request $request): void
    {
        $u = $request->user();
        if (! $u || ! $u->canWrite()) {
            abort(response()->json(['error' => 'role_forbidden'], 403));
        }
    }
}

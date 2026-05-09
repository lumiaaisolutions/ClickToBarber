<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Audit\PiiAccessLogger;
use App\Domain\Identity\Models\User;
use App\Domain\Notifications\Models\NotificationLog;
use App\Domain\Payments\Models\Payment;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoints GDPR / LFPDPPP — derecho de acceso y borrado.
 *
 * GET  /api/admin/gdpr/export      — descarga JSON con todos los datos del tenant.
 * POST /api/admin/gdpr/delete-client/{userId}
 *      — borra un cliente final concreto (soft delete, anonimización opcional).
 */
final class GdprController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    /**
     * Exporta el bundle completo del tenant para Art. 15 GDPR / Art. 22 LFPDPPP.
     */
    public function export(Request $request): JsonResponse
    {
        $this->guardAdmin($request);
        $tenant = $this->current->require();

        $clients = User::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('role', User::ROLE_CLIENT)
            ->get(['id', 'name', 'email', 'phone', 'last_visit_at', 'notes', 'created_at'])
            ->toArray();

        $appointments = Appointment::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->get()->toArray();

        $payments = Payment::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->get()->toArray();

        $notifications = NotificationLog::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->get()->toArray();

        PiiAccessLogger::log('admin.gdpr.export', 'tenant', $tenant->id, count($clients) + count($appointments));

        return response()->json([
            'export_at' => now()->toIso8601String(),
            'tenant'    => [
                'id'   => $tenant->id,
                'slug' => $tenant->slug,
                'name' => $tenant->name,
            ],
            'clients'        => $clients,
            'appointments'   => $appointments,
            'payments'       => $payments,
            'notifications'  => $notifications,
        ])->header(
            'Content-Disposition',
            'attachment; filename="lumia-export-' . $tenant->slug . '-' . now()->format('Y-m-d') . '.json"',
        );
    }

    /**
     * Borra un cliente final del tenant (Art. 17 GDPR).
     * Soft-delete en SoftDeletes + anonimización del email (no se puede recuperar).
     */
    public function deleteClient(Request $request, int $userId): JsonResponse
    {
        $this->guardAdmin($request);
        $tenant = $this->current->require();

        $user = User::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('role', User::ROLE_CLIENT)
            ->where('id', $userId)
            ->first();

        if (! $user) {
            return response()->json(['error' => 'not_found'], 404);
        }

        // Anonimiza antes del soft-delete para que el email no quede recuperable.
        $user->forceFill([
            'name'  => 'Cliente eliminado',
            'email' => 'deleted-' . $user->id . '@anonymized.invalid',
            'phone' => null,
            'notes' => null,
        ])->save();
        $user->delete();

        return response()->json(['ok' => true, 'anonymized' => true]);
    }

    private function guardAdmin(Request $request): void
    {
        $user = $request->user();
        if (! $user || ! $user->isAdmin()) {
            abort(response()->json(['error' => 'admin_only'], 403));
        }
    }
}

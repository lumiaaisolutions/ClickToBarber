<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Billing\Models\CfdiInvoice;
use App\Domain\Billing\Services\EmitCfdiForAppointment;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * CFDI 4.0 — emisión y listado.
 *
 *  GET  /api/admin/cfdi               → últimos 100 comprobantes del tenant
 *  POST /api/admin/cfdi/{appointment} → emite CFDI para esa cita
 *  GET  /api/admin/cfdi/{id}/xml      → descarga XML sellado
 */
final class CfdiController extends Controller
{
    public function __construct(
        private CurrentTenant $current,
        private EmitCfdiForAppointment $emit,
    ) {}

    public function index(): JsonResponse
    {
        $tenant = $this->current->require();
        return response()->json(
            CfdiInvoice::query()
                ->where('tenant_id', $tenant->id)
                ->orderByDesc('id')
                ->limit(100)
                ->get(['id', 'appointment_id', 'rfc_emisor', 'rfc_receptor', 'uso_cfdi', 'uuid_sat', 'subtotal_cents', 'iva_cents', 'total_cents', 'status', 'stamped_at']),
        );
    }

    public function store(Request $request, int $appointmentId): JsonResponse
    {
        $u = $request->user();
        if (! $u || ! $u->canWrite()) abort(response()->json(['error' => 'role_forbidden'], 403));

        $data = $request->validate([
            'rfc_receptor'           => ['required', 'string', 'size:13'],
            'nombre_receptor'        => ['required', 'string', 'max:200'],
            'codigo_postal_receptor' => ['required', 'string', 'size:5'],
            'regimen_receptor'       => ['required', 'string', 'size:3'],
            'uso_cfdi'               => ['required', 'string', 'max:10'],
            'forma_pago'             => ['nullable', 'string', 'size:2'],
            'metodo_pago'            => ['nullable', 'string', 'size:3'],
        ]);

        try {
            $invoice = $this->emit->execute($appointmentId, $data);
            return response()->json($invoice, 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'pac_failed', 'message' => $e->getMessage()], 502);
        }
    }

    public function downloadXml(Request $request, int $id)
    {
        $tenant = $this->current->require();
        $row = CfdiInvoice::query()->where('tenant_id', $tenant->id)->findOrFail($id);
        if (! $row->xml_path) abort(404);

        $disk = Storage::disk(env('CFDI_DISK', 'local'));
        if (! $disk->exists($row->xml_path)) abort(404);

        return response($disk->get($row->xml_path), 200, [
            'Content-Type'        => 'application/xml',
            'Content-Disposition' => 'attachment; filename="cfdi-' . ($row->uuid_sat ?? $row->id) . '.xml"',
        ]);
    }
}

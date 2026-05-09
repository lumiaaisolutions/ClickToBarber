<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Audit\Models\AuditLog;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AuditLogController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function index(Request $request): JsonResponse
    {
        $tenant = $this->current->require();
        $limit  = min(200, (int) $request->query('limit', 50));
        $action = (string) $request->query('action', '');

        $q = AuditLog::query()
            ->where('tenant_id', $tenant->id)
            ->orderByDesc('id')
            ->limit($limit);

        if ($action !== '') {
            $q->where('action', $action);
        }

        $logs = $q->get()->map(fn (AuditLog $l) => [
            'id'          => $l->id,
            'action'      => $l->action,
            'subject'     => [
                'type' => class_basename($l->subject_type),
                'id'   => $l->subject_id,
            ],
            'actor'       => $l->actor_email,
            'changes'     => $l->changes,
            'ip'          => $l->ip_address,
            'request_id'  => $l->request_id,
            'created_at'  => $l->created_at?->toIso8601String(),
        ]);

        return response()->json([
            'count' => $logs->count(),
            'logs'  => $logs,
        ]);
    }
}

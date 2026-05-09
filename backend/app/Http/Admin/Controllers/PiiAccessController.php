<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

final class PiiAccessController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function __invoke(): JsonResponse
    {
        $tenant = $this->current->require();

        $logs = DB::table('pii_access_log')
            ->leftJoin('users', 'pii_access_log.actor_user_id', '=', 'users.id')
            ->where('pii_access_log.tenant_id', $tenant->id)
            ->orderByDesc('pii_access_log.id')
            ->limit(200)
            ->get([
                'pii_access_log.id', 'pii_access_log.endpoint', 'pii_access_log.subject_type',
                'pii_access_log.subject_id', 'pii_access_log.row_count', 'pii_access_log.ip_address',
                'pii_access_log.created_at', 'users.email as actor_email',
            ]);

        return response()->json([
            'count' => $logs->count(),
            'logs'  => $logs,
        ]);
    }
}

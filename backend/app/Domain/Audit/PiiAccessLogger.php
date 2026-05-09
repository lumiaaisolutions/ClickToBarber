<?php

declare(strict_types=1);

namespace App\Domain\Audit;

use Illuminate\Support\Facades\DB;

/**
 * Helper para registrar accesos a endpoints que devuelven PII de clientes
 * finales. Llamar al final del controller con el row_count y subject_type.
 */
final class PiiAccessLogger
{
    public static function log(string $endpoint, ?string $subjectType = null, ?string $subjectId = null, ?int $rowCount = null): void
    {
        $request = request();
        DB::table('pii_access_log')->insert([
            'tenant_id'     => app(\App\Domain\Tenancy\CurrentTenant::class)->id(),
            'actor_user_id' => optional($request->user())->id,
            'endpoint'      => $endpoint,
            'subject_type'  => $subjectType,
            'subject_id'    => $subjectId,
            'row_count'     => $rowCount,
            'ip_address'    => $request->ip(),
            'created_at'    => now(),
        ]);
    }
}

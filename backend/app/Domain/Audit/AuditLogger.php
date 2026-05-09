<?php

declare(strict_types=1);

namespace App\Domain\Audit;

use App\Domain\Audit\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

/**
 * Punto único para escribir entradas en audit_logs.
 *
 * Usado por:
 *  - LoggableChanges trait (Eloquent observers para create/update/delete)
 *  - AuthController (login.success / login.failed / 2fa.enabled / ...)
 *  - StripeWebhookController (subscription.canceled, etc.)
 */
final class AuditLogger
{
    public static function record(
        string $action,
        string $subjectType,
        string|int $subjectId,
        ?array $changes = null,
        ?string $tenantId = null,
        ?int $actorUserId = null,
        ?string $actorEmail = null,
    ): AuditLog {
        $request = request();

        return AuditLog::create([
            'tenant_id'     => $tenantId ?? app(\App\Domain\Tenancy\CurrentTenant::class)->id(),
            'actor_user_id' => $actorUserId ?? optional($request->user())->id,
            'actor_email'   => $actorEmail ?? optional($request->user())->email,
            'action'        => $action,
            'subject_type'  => $subjectType,
            'subject_id'    => (string) $subjectId,
            'changes'       => $changes,
            'ip_address'    => $request->ip(),
            'request_id'    => $request->attributes->get('request_id'),
            'created_at'    => now(),
        ]);
    }

    public static function recordModel(string $action, Model $model, ?array $changes = null): AuditLog
    {
        return self::record(
            action: $action,
            subjectType: $model::class,
            subjectId: $model->getKey(),
            changes: $changes,
            tenantId: $model->getAttribute('tenant_id') ?? null,
        );
    }
}

<?php

declare(strict_types=1);

namespace App\Domain\Audit;

use App\Domain\Audit\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

/**
 * Trait para activar audit log automático en cualquier modelo Eloquent.
 *
 * Registra create / update (con diff) / delete en audit_logs. Los campos
 * sensibles (password, two_factor_*, tokens) se redactan antes de persistir.
 *
 * Uso:
 *
 *   class Tenant extends Model {
 *       use LoggableChanges;
 *       protected $auditExclude = ['updated_at']; // opcional
 *   }
 */
trait LoggableChanges
{
    /** @var string[] Campos que NUNCA aparecen en audit_logs. */
    private static array $globallyRedacted = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'token_hash',
        'access_token',
        'refresh_token',
    ];

    public static function bootLoggableChanges(): void
    {
        static::created(function (Model $model) {
            AuditLogger::recordModel(
                action: AuditLog::ACTION_CREATED,
                model: $model,
                changes: ['after' => self::redact($model->getAttributes())],
            );
        });

        static::updated(function (Model $model) {
            $dirty = $model->getDirty();
            $original = array_intersect_key($model->getOriginal(), $dirty);
            if (empty($dirty)) {
                return;
            }
            AuditLogger::recordModel(
                action: AuditLog::ACTION_UPDATED,
                model: $model,
                changes: [
                    'before' => self::redact($original),
                    'after'  => self::redact($dirty),
                ],
            );
        });

        static::deleted(function (Model $model) {
            AuditLogger::recordModel(
                action: AuditLog::ACTION_DELETED,
                model: $model,
                changes: ['snapshot' => self::redact($model->getAttributes())],
            );
        });
    }

    private static function redact(array $attrs): array
    {
        $out = [];
        foreach ($attrs as $k => $v) {
            if (in_array($k, self::$globallyRedacted, true)) {
                $out[$k] = '[REDACTED]';
                continue;
            }
            // Trunca strings largos para no inflar audit_logs.
            $out[$k] = is_string($v) && strlen($v) > 500 ? substr($v, 0, 500) . '…' : $v;
        }

        return $out;
    }
}

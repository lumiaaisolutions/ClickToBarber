<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Habilita Row Level Security en todas las tablas tenant-scoped.
 *
 * El middleware ResolveTenant emite `SET LOCAL app.current_tenant = '<uuid>'`
 * al inicio de cada request. La política `tenant_isolation` filtra cualquier
 * SELECT/UPDATE/DELETE/INSERT por ese setting. Defensa en profundidad: incluso
 * si la capa de aplicación olvidara aplicar el TenantScope global, PostgreSQL
 * impide leer o modificar filas de otros tenants.
 *
 * Esta migración es no-op fuera de PostgreSQL (SQLite local de desarrollo
 * no soporta RLS). En producción siempre corre PostgreSQL.
 */
return new class extends Migration
{
    /** Tablas con columna tenant_id que deben quedar bajo RLS. */
    private const TENANT_TABLES = [
        'users',
        'barbers',
        'barber_shifts',
        'barber_service',
        'business_hours',
        'services',
        'products',
        'stock_movements',
        'appointments',
        'appointment_status_history',
        'payments',
        'tickets',
        'ticket_items',
        'cash_closes',
        'notifications_log',
        'campaigns',
        'coupons',
    ];

    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        foreach (self::TENANT_TABLES as $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            DB::statement("ALTER TABLE {$table} ENABLE ROW LEVEL SECURITY");
            DB::statement("ALTER TABLE {$table} FORCE ROW LEVEL SECURITY");

            DB::statement("DROP POLICY IF EXISTS tenant_isolation ON {$table}");
            DB::statement(<<<SQL
                CREATE POLICY tenant_isolation ON {$table}
                    USING (tenant_id::text = current_setting('app.current_tenant', true))
                    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
            SQL);
        }

        // El owner del schema se salta RLS por defecto; mantenemos ese
        // comportamiento para que migraciones, seeders y backups funcionen.
        // Para cuentas de aplicación se debe usar un rol distinto sin BYPASSRLS.
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        foreach (self::TENANT_TABLES as $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            DB::statement("DROP POLICY IF EXISTS tenant_isolation ON {$table}");
            DB::statement("ALTER TABLE {$table} DISABLE ROW LEVEL SECURITY");
        }
    }
};

<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduler — todos los crons en un sólo lugar
|--------------------------------------------------------------------------
| Activar con: php artisan schedule:work (dev) o crontab "* * * * * php artisan schedule:run".
*/

// Suspende tenants past_due > N días → downgrade a Free.
Schedule::command('lumia:enforce-dunning')
    ->dailyAt('03:00')
    ->withoutOverlapping()
    ->onOneServer();

// Re-verifica TXT DNS de custom domains; si el dueño borró el record,
// quita la verificación para que el host deje de resolver al tenant.
Schedule::command('lumia:reverify-domains')
    ->dailyAt('04:00')
    ->withoutOverlapping();

// Marca como expired los referrals pending vencidos.
Schedule::command('lumia:expire-referrals')
    ->dailyAt('04:30');

// Purga audit_logs viejos (default 365 días).
Schedule::command('lumia:purge-audit-logs')
    ->weeklyOn(1, '02:00')   // lunes 02:00
    ->withoutOverlapping();

// Materializa próximas citas de las series recurrentes activas.
Schedule::command('lumia:materialize-recurrences')
    ->dailyAt('05:00')
    ->withoutOverlapping();

// Calcula comisiones acumuladas de afiliados (1er día del mes).
Schedule::command('lumia:pay-affiliate-commissions')
    ->monthlyOn(1, '06:00')
    ->withoutOverlapping();

// Health poll cada minuto: si /up/deep falla 3 veces seguidas → alerta Slack.
Schedule::command('lumia:health-poll')
    ->everyMinute()
    ->withoutOverlapping()
    ->onOneServer();

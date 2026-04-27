<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\ValueObjects\AppointmentStatus;
use App\Domain\Identity\Models\User;
use App\Domain\Marketing\Services\RetentionScan;
use App\Domain\Payments\Models\Payment;
use App\Domain\Tenancy\CurrentTenant;
use Carbon\CarbonImmutable;

final class AdminDashboardController
{
    public function __construct(
        private CurrentTenant $current,
        private RetentionScan $retention,
    ) {}

    public function __invoke()
    {
        $tenant = $this->current->require();
        $today = CarbonImmutable::today($tenant->timezone);
        $monthStart = $today->startOfMonth();

        $todayAppointments = Appointment::whereDate('starts_at', $today->toDateString())
            ->whereNotIn('status', [AppointmentStatus::Cancelled->value, AppointmentStatus::NoShow->value])
            ->count();

        $monthAppointments = Appointment::whereBetween('starts_at', [$monthStart, $today->endOfDay()])
            ->whereIn('status', [AppointmentStatus::Completed->value, AppointmentStatus::Confirmed->value])
            ->count();

        $monthRevenue = (int) Payment::whereBetween('created_at', [$monthStart, $today->endOfDay()])
            ->where('status', 'succeeded')
            ->sum('amount_cents');

        $totalClients = User::where('role', User::ROLE_CLIENT)->count();
        $inactiveClients = $this->retention->inactiveClients($tenant->id, 30)->count();

        return [
            'tenant' => [
                'id'   => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'plan' => $tenant->plan?->code,
            ],
            'kpis' => [
                'today_appointments'  => $todayAppointments,
                'month_appointments'  => $monthAppointments,
                'month_revenue_cents' => $monthRevenue,
                'month_revenue'       => '$' . number_format($monthRevenue / 100, 2) . ' MXN',
                'total_clients'       => $totalClients,
                'inactive_clients_30d'=> $inactiveClients,
            ],
            'features' => $tenant->plan?->features ?? [],
        ];
    }
}

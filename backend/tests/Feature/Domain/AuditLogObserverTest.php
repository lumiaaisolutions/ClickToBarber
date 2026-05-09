<?php

declare(strict_types=1);

use App\Domain\Audit\Models\AuditLog;
use App\Domain\Tenancy\Models\Tenant;

beforeEach(function () {
    $this->demo = createDemoTenant();
});

it('registra "created" cuando un tenant se crea', function () {
    $count = AuditLog::query()->where('action', AuditLog::ACTION_CREATED)->count();
    expect($count)->toBeGreaterThan(0);

    $sample = AuditLog::query()->where('action', AuditLog::ACTION_CREATED)
        ->where('subject_type', Tenant::class)->first();
    expect($sample)->not->toBeNull()
        ->and($sample->changes)->toHaveKey('after');
});

it('registra "updated" con diff before/after', function () {
    $tenant = $this->demo['tenant'];
    AuditLog::query()->where('subject_id', $tenant->id)->delete(); // limpiamos para aislar

    $tenant->update(['name' => 'Nombre nuevo de prueba']);

    $log = AuditLog::query()
        ->where('action', AuditLog::ACTION_UPDATED)
        ->where('subject_id', $tenant->id)
        ->latest('id')->first();

    expect($log)->not->toBeNull()
        ->and($log->changes['after'])->toHaveKey('name', 'Nombre nuevo de prueba')
        ->and($log->changes['before'])->toHaveKey('name')
        ->and($log->changes['before']['name'])->not->toBe('Nombre nuevo de prueba');
});

it('redacta campos sensibles en password / 2fa_secret / refresh_token', function () {
    AuditLog::query()->truncate();

    $user = $this->demo['admin'];
    $user->update(['password' => bcrypt('newpass'), 'phone' => '+5215588889999']);

    $log = AuditLog::query()
        ->where('action', AuditLog::ACTION_UPDATED)
        ->where('subject_id', $user->id)
        ->latest('id')->first();

    expect($log->changes['after'])->toHaveKey('password', '[REDACTED]');
    // El phone NO se redacta (es PII pero se cifra a nivel modelo, no aquí)
});

it('snapshot completo en delete', function () {
    AuditLog::query()->truncate();

    $tenant = Tenant::create([
        'slug' => 'temp-' . uniqid(),
        'name' => 'Temporal',
        'owner_email' => 't@t.local',
        'plan_id' => $this->demo['plan']->id,
        'plan_status' => 'active',
        'timezone' => 'UTC',
    ]);
    $id = $tenant->id;
    $tenant->delete();

    $log = AuditLog::query()
        ->where('action', AuditLog::ACTION_DELETED)
        ->where('subject_id', $id)->first();

    expect($log)->not->toBeNull()
        ->and($log->changes)->toHaveKey('snapshot');
});

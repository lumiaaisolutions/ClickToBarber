<?php

declare(strict_types=1);

it('boots the application', function () {
    expect(app())->not->toBeNull();
});

it('responds to health endpoint', function () {
    $this->getJson('/api/health')
        ->assertOk()
        ->assertJsonStructure(['ok', 'service', 'time']);
});

<?php

use App\Http\Common\Middleware\EnsureFeatureEnabled;
use App\Http\Common\Middleware\EnsureRole;
use App\Http\Common\Middleware\RateLimitByIp;
use App\Http\Common\Middleware\ResolveTenant;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->statefulApi();

        $middleware->alias([
            'tenant'         => ResolveTenant::class,
            'feature'        => EnsureFeatureEnabled::class,
            'role'           => EnsureRole::class,
            'rate.ip'        => RateLimitByIp::class,
            'sanctum.stateful' => EnsureFrontendRequestsAreStateful::class,
        ]);

        // Aplica rate limit + tenant a todo el grupo api
        $middleware->api(append: [
            RateLimitByIp::class,
            ResolveTenant::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();

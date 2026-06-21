<?php

use App\Http\Common\Middleware\EnsureFeatureEnabled;
use App\Http\Common\Middleware\EnsureRole;
use App\Http\Common\Middleware\RateLimitByIp;
use App\Http\Common\Middleware\RequestContext;
use App\Http\Common\Middleware\ResolveTenant;
use App\Http\Common\Middleware\ResolveTenantByHost;
use App\Http\Common\Middleware\SecurityHeaders;
use App\Http\Common\Middleware\VerifyWebhookSignature;
use App\Infrastructure\Observability\ErrorReporter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Rate limiters nombrados (referenciables como middleware('throttle:NAME'))
            RateLimiter::for('login', function (Request $request) {
                $email = (string) $request->input('email', '');
                $key   = 'login:' . sha1(strtolower($email) . '|' . $request->ip());
                $max   = (int) config('security.throttle.login.attempts', 5);
                $decay = (int) config('security.throttle.login.decay_minutes', 1);

                return Limit::perMinutes($decay, $max)->by($key)->response(function () {
                    return response()->json([
                        'error'   => 'too_many_login_attempts',
                        'message' => 'Demasiados intentos. Espera un minuto antes de reintentar.',
                    ], 429);
                });
            });

            RateLimiter::for('booking', function (Request $request) {
                $key   = 'booking:' . sha1($request->ip() . '|' . $request->header('X-Tenant', ''));
                $max   = (int) config('security.throttle.booking.attempts', 10);
                $decay = (int) config('security.throttle.booking.decay_minutes', 1);

                return Limit::perMinutes($decay, $max)->by($key)->response(function () {
                    return response()->json([
                        'error'   => 'too_many_booking_attempts',
                        'message' => 'Demasiadas reservas en poco tiempo. Intenta más tarde.',
                    ], 429);
                });
            });

            RateLimiter::for('webhook', function (Request $request) {
                return Limit::perMinute(120)->by($request->ip());
            });
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        // NO se usa statefulApi(): la SPA habla con el backend vía Bearer tokens
        // (Sanctum personal access tokens) reenviados por route handlers de
        // Next.js desde una cookie httpOnly. statefulApi() obligaría CSRF a
        // toda /api/*, rompiendo endpoints públicos como /api/client/appointments
        // con 419 Page Expired.

        $middleware->alias([
            'tenant'   => ResolveTenant::class,
            'feature'  => EnsureFeatureEnabled::class,
            'role'     => EnsureRole::class,
            'rate.ip'  => RateLimitByIp::class,
            'webhook'  => VerifyWebhookSignature::class,
            'apikey'   => \App\Http\Common\Middleware\AuthenticateApiKey::class,
            'force2fa' => \App\Http\Common\Middleware\EnforceTwoFactor::class,
        ]);

        // Aplica rate limit + tenant + security headers + request context
        // a todo el grupo api. RequestContext debe ir DESPUÉS de ResolveTenant
        // para que tenga el tenant_id resuelto cuando empuja contexto al log.
        // ResolveTenantByHost es el último fallback: si no resolvió por
        // bearer/slug/X-Tenant, intenta por Host (custom domain).
        $middleware->api(append: [
            SecurityHeaders::class,
            RateLimitByIp::class,
            ResolveTenant::class,
            ResolveTenantByHost::class,
            \App\Http\Common\Middleware\RateLimitByTenant::class,
            RequestContext::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Reporta excepciones no manejadas a Sentry-compatible (no-op si SENTRY_DSN vacío).
        $exceptions->report(function (\Throwable $e) {
            // Skipear excepciones esperadas: validation, 404, 401, etc.
            $skip = [
                \Illuminate\Validation\ValidationException::class,
                \Illuminate\Auth\AuthenticationException::class,
                \Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class,
                \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException::class,
                \Illuminate\Http\Exceptions\ThrottleRequestsException::class,
            ];
            foreach ($skip as $type) {
                if ($e instanceof $type) {
                    return;
                }
            }

            try {
                app(ErrorReporter::class)->capture($e, [
                    'tags' => [
                        'route' => optional(request()->route())->uri() ?? 'unknown',
                    ],
                ]);
            } catch (\Throwable) {
                // Nunca romper la respuesta original por un fallo del reporter.
            }
        });
    })->create();

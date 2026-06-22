<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Previene N+1 fuera de producción
        Model::preventLazyLoading(! $this->app->isProduction());
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());

        RateLimiter::for('login',   fn (Request $r) => Limit::perMinute(10)->by($r->ip()));
        RateLimiter::for('booking', fn (Request $r) => Limit::perMinute(20)->by($r->ip()));
        RateLimiter::for('webhook', fn (Request $r) => Limit::perMinute(120)->by($r->ip()));
    }
}

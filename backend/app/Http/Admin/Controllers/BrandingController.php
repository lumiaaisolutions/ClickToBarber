<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\Models\TenantBranding;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Maneja la identidad visual del tenant: lectura/escritura desde /admin
 * y consulta pública desde /api/tenant/{slug}/branding (para hidratar el
 * <BrandingProvider> en /b/{slug}).
 *
 * Reglas:
 *   - Cualquier rol del portal puede LEER su branding.
 *   - Sólo admin / manager / platform_owner pueden ESCRIBIR.
 *   - El endpoint público devuelve sólo lo cosmético (sin metadatos
 *     internos como admin_display_name).
 */
final class BrandingController extends Controller
{
    /**
     * GET /api/admin/branding — branding del tenant del usuario autenticado.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->tenant_id) {
            return response()->json(['error' => 'no_tenant'], 422);
        }

        $branding = TenantBranding::query()
            ->where('tenant_id', $user->tenant_id)
            ->first()
            ?? $this->seedDefault($user->tenant_id);

        return response()->json([
            'data' => $this->serialize($branding, public: false),
        ]);
    }

    /**
     * PUT /api/admin/branding — actualiza tokens. Sólo admin/manager.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->canWrite()) {
            return response()->json(['error' => 'role_forbidden'], 403);
        }

        $data = $request->validate([
            'preset'             => ['nullable', 'string', 'max:32'],
            'primary_color'      => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'accent_color'       => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'font_display'       => ['nullable', 'string', 'max:64'],
            'font_body'          => ['nullable', 'string', 'max:64'],
            'radius'             => ['nullable', 'in:sharp,soft,round'],
            'density'            => ['nullable', 'in:compact,comfortable,airy'],
            'mode'               => ['nullable', 'in:light,sepia,dark'],
            'logo_url'           => ['nullable', 'url', 'max:512'],
            'cover_url'          => ['nullable', 'url', 'max:512'],
            'admin_display_name' => ['nullable', 'string', 'max:128'],
            'public_tagline'     => ['nullable', 'string', 'max:255'],
        ]);

        $branding = TenantBranding::query()
            ->where('tenant_id', $user->tenant_id)
            ->first()
            ?? $this->seedDefault($user->tenant_id);

        $branding->fill(array_filter($data, fn ($v) => $v !== null));
        $branding->save();

        return response()->json([
            'data' => $this->serialize($branding->fresh(), public: false),
        ]);
    }

    /**
     * POST /api/admin/onboarding/complete — marca first_login_at del user.
     * Acepta también guardar branding inicial en un solo round-trip.
     */
    public function completeOnboarding(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['error' => 'unauthenticated'], 401);
        }

        // Guarda branding si vino en el payload (mismo schema que update)
        if ($request->isNotFilled('skip_branding') && $user->canWrite()) {
            $payload = $request->validate([
                'preset'             => ['nullable', 'string', 'max:32'],
                'primary_color'      => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
                'accent_color'       => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
                'font_display'       => ['nullable', 'string', 'max:64'],
                'font_body'          => ['nullable', 'string', 'max:64'],
                'radius'             => ['nullable', 'in:sharp,soft,round'],
                'density'            => ['nullable', 'in:compact,comfortable,airy'],
                'mode'               => ['nullable', 'in:light,sepia,dark'],
                'logo_url'           => ['nullable', 'url', 'max:512'],
                'admin_display_name' => ['nullable', 'string', 'max:128'],
                'public_tagline'     => ['nullable', 'string', 'max:255'],
                'tenant_name'        => ['nullable', 'string', 'max:128'],
            ]);

            if (! empty($payload['tenant_name'])) {
                Tenant::query()->withoutGlobalScopes()
                    ->where('id', $user->tenant_id)
                    ->update(['name' => $payload['tenant_name']]);
                unset($payload['tenant_name']);
            }

            $branding = TenantBranding::query()
                ->where('tenant_id', $user->tenant_id)
                ->first()
                ?? $this->seedDefault($user->tenant_id);

            $branding->fill(array_filter($payload, fn ($v) => $v !== null));
            $branding->save();
        }

        $user->first_login_at = now();
        $user->save();

        return response()->json([
            'ok'    => true,
            'first_login_at' => $user->first_login_at?->toIso8601String(),
        ]);
    }

    /**
     * GET /api/tenant/{slug}/branding — sólo lectura pública para /b/{slug}.
     */
    public function publicShow(string $slug): JsonResponse
    {
        $tenant = Tenant::query()->withoutGlobalScopes()->where('slug', $slug)->first();
        if (! $tenant) {
            return response()->json(['error' => 'not_found'], 404);
        }

        $branding = TenantBranding::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->first()
            ?? $this->seedDefault($tenant->id);

        return response()->json([
            'data' => $this->serialize($branding, public: true),
        ]);
    }

    private function seedDefault(string $tenantId): TenantBranding
    {
        $branding = new TenantBranding();
        $branding->fill(TenantBranding::defaultsForTenant($tenantId));
        $branding->save();

        return $branding;
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(TenantBranding $b, bool $public): array
    {
        $base = [
            'preset'        => $b->preset,
            'primary_color' => $b->primary_color,
            'accent_color'  => $b->accent_color,
            'font_display'  => $b->font_display,
            'font_body'     => $b->font_body,
            'radius'        => $b->radius,
            'density'       => $b->density,
            'mode'          => $b->mode,
            'logo_url'      => $b->logo_url,
            'cover_url'     => $b->cover_url,
            'public_tagline' => $b->public_tagline,
        ];

        if (! $public) {
            $base['admin_display_name'] = $b->admin_display_name;
            $base['updated_at']         = $b->updated_at?->toIso8601String();
        }

        return $base;
    }
}

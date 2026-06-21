<?php

declare(strict_types=1);

namespace App\Domain\Tenancy\Models;

use App\Domain\Audit\LoggableChanges;
use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Identidad visual por tenant. 1-1 con Tenant.
 *
 * Estos campos alimentan el <BrandingProvider> del frontend; el provider
 * los expone como CSS variables scoped a /admin/{slug} y /b/{slug}, lo
 * que evita cualquier contaminación entre sesiones paralelas de tenants
 * distintos.
 */
class TenantBranding extends Model
{
    use BelongsToTenant, LoggableChanges;

    protected $table = 'tenant_branding';

    protected $fillable = [
        'tenant_id',
        'preset',
        'primary_color',
        'accent_color',
        'font_display',
        'font_body',
        'radius',
        'density',
        'mode',
        'logo_url',
        'cover_url',
        'admin_display_name',
        'public_tagline',
        'extra',
    ];

    protected function casts(): array
    {
        return [
            'extra' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Defaults del preset old-money-emerald de LUMIA.
     */
    public static function defaultsForTenant(string $tenantId): array
    {
        return [
            'tenant_id'     => $tenantId,
            'preset'        => 'old-money-emerald',
            'primary_color' => '#1F3D2B',
            'accent_color'  => '#B8935E',
            'font_display'  => 'Cormorant Garamond',
            'font_body'     => 'Inter Tight',
            'radius'        => 'soft',
            'density'       => 'comfortable',
            'mode'          => 'light',
        ];
    }
}

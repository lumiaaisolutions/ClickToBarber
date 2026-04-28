# Branding por tenant — guía rápida

> Este documento describe cómo funciona el white-label dinámico de LUMIA.
> Léelo antes de tocar `BrandingProvider`, `tenant_branding` o `globals.css`.

## Modelo conceptual

LUMIA tiene **dos capas visuales**:

1. **Identidad LUMIA (fija)** — `/`, `/precios`, `/login`, `/checkout`. Palette
   old-money clara, definida en `frontend/src/app/globals.css` bajo `:root`.
   **Nunca se sobrescribe por tenant.**
2. **Identidad del tenant** — `/admin/*`, `/b/{slug}`. Hereda de la base LUMIA
   pero las CSS variables `--primary`, `--accent`, `--tenant-radius`, etc. se
   sobrescriben por tenant en su subtree.

## Flujo de datos

```
Backend                                Frontend
─────────────                          ───────────────
tenant_branding (tabla)                (1) Server Component
  ↓                                        loads branding
TenantBranding (modelo)                  via fetchAdminBranding() o
  ↓                                       fetchPublicBranding(slug)
BrandingController                         ↓
  ├─ GET  /admin/branding (auth)      (2) <BrandingProvider branding={...}>
  ├─ PUT  /admin/branding (auth, RW)         applies CSS vars to subtree:
  ├─ GET  /tenant/{slug}/branding          --primary, --accent,
  └─ POST /admin/onboarding/complete       --tenant-radius, --tenant-density
                                       (3) Children inherit los tokens
```

## Por qué CSS variables scoped (no :root override)

Si sobrescribiéramos `:root` global, **dos pestañas con tenants distintos en
SSR compartirían el mismo HTML cache** (Next ISR/edge) y/o el último branding
ganaría. Scoped al subtree garantiza:

- Cero contaminación entre sesiones paralelas.
- Cada `<BrandingProvider>` declara `style={{ --primary: ... }}` en su wrapper
  y todos los descendientes heredan, pero **otros subtrees no**.
- El SSR genera HTML correcto por request (Next 16 cookies/headers son
  per-request).

## Los 4 presets oficiales

| code | Primary | Accent | Mode | Familia |
|------|---------|--------|------|---------|
| `old-money-emerald` | `#1F3D2B` | `#B8935E` | light | Verde botella + oro mate |
| `ivory-brass`       | `#4A3320` | `#A37438` | sepia | Marfil + latón pulido |
| `navy-classic`      | `#1A2F4F` | `#8C9DB5` | light | Navy + plata vieja |
| `carbon-premium`    | `#2D5240` | `#C9A961` | dark  | Carbón + latón |

Más detalle en `docs/PRESETS.md`.

## Reglas para añadir tokens nuevos

1. **No añadas más colores en :root** — la paleta es 4-5 tokens, no más.
2. Si necesitas variar algo por tenant, agrégalo a `tenant_branding` (migración
   nueva) y al `BrandingProvider`. Mapéalo a una variable CSS `--tenant-*`.
3. Los componentes deben referenciar `var(--tenant-primary)` (o
   `text-tenant-primary` si lo registramos en `@theme inline`).
4. **Nunca** uses colores hardcoded en componentes que viven dentro del
   subtree del tenant. Siempre via CSS var o token Tailwind.

## Editing UI

- **Wizard** (primer login): `frontend/src/components/admin/OnboardingWizard.tsx`
- **Editor** (cambios posteriores): `frontend/src/components/admin/BrandingEditor.tsx`
- Ambos usan los mismos tokens del backend.

## Endpoint de onboarding

`POST /api/admin/onboarding/complete` acepta el mismo payload que `PUT
/branding` MÁS un `tenant_name` opcional (cambia el nombre del tenant si el
admin lo modificó en el wizard). Marca `users.first_login_at = now()` y a
partir de ahí el middleware del layout deja de redirigir al wizard.

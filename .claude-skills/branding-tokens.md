# Branding por tenant — guía rápida

> Este documento describe cómo funciona el white-label dinámico de LUMIA.
> Léelo antes de tocar `BrandingProvider`, `tenant_branding` o `globals.css`.
>
> **Detalle de arquitectura**: `docs/IDENTITY_SYSTEM.md`.
> **Catálogo de presets**: `docs/PRESETS.md`.

## Modelo conceptual

LUMIA tiene **dos capas visuales**:

1. **Identidad LUMIA (fija)** — `/`, `/precios`, `/login`, `/checkout`.
   Paleta old-money clara, definida en `frontend/src/app/globals.css` bajo
   `:root`. **Nunca se sobrescribe por tenant.**
2. **Identidad del tenant** — `/admin/*`, `/b/{slug}`. Hereda de la base
   LUMIA pero las CSS variables `--lumia-*`, `--primary`, `--accent`,
   `--tenant-radius`, etc. se sobrescriben por tenant en su subtree vía
   `<BrandingProvider>`.

## Flujo de datos

```
Backend                                Frontend
─────────────                          ───────────────
tenant_branding (tabla)                (1) Server Component
  + extra (JSON con palette completa)      loads branding
  ↓                                        via fetchAdminBranding() o
TenantBranding (modelo)                    fetchPublicBranding(slug)
  ↓                                        ↓
BrandingController                     (2) flatToRich(flat) → RichBranding
  ├─ GET  /admin/branding (auth)            ↓
  ├─ PUT  /admin/branding (auth, RW)   (3) <BrandingProvider branding={flat}>
  ├─ GET  /tenant/{slug}/branding          aplica CSS vars al subtree:
  └─ POST /admin/onboarding/complete       --lumia-bg, --lumia-ink,
                                           --lumia-accent, --lumia-radius,
                                           --lumia-density-scale,
                                           --lumia-font-display, …
                                       (4) Inyecta <link> de Google Fonts
                                           del par tipográfico
                                       (5) Children heredan los tokens
```

## Por qué CSS variables scoped (no :root override)

Si sobrescribiéramos `:root` global, **dos pestañas con tenants distintos
en SSR compartirían el mismo HTML cache** (Next ISR/edge) y/o el último
branding ganaría. Scoped al subtree garantiza:

- Cero contaminación entre sesiones paralelas.
- Cada `<BrandingProvider>` declara `style={{ '--lumia-*': ... }}` en su
  wrapper y todos los descendientes heredan, pero **otros subtrees no**.
- El SSR genera HTML correcto por request (Next 16 cookies/headers son
  per-request).

## Los 6 presets oficiales

| id | Acento principal | Acento profundo | Para |
|----|------------------|------------------|------|
| `champagne`  | `#B8A88A` | `#8A7A5C` | Premium clásico, neutral cálido |
| `emerald`    | `#B8935E` | `#1F3D2B` | Verde botella + oro mate (default LUMIA) |
| `terracotta` | `#B86E50` | `#8A4C36` | Latina/mediterránea, calidez visible |
| `midnight`   | `#3F4B6E` | `#2A3454` | Nocturno, lounge, formal |
| `rose`       | `#B97A85` | `#8C525D` | Boutique, unisex, salón-spa |
| `forest`     | `#3F6B4E` | `#274836` | Tradicional, eco, outdoor |

Cada preset tiene paleta light **y** dark sincronizadas. Detalle completo
en `docs/PRESETS.md`.

## Variables CSS que aplica el provider

Sobre el wrapper `<div data-tenant-branding>`:

### Paleta (15 tokens)
- `--lumia-bg`, `--lumia-surface`, `--lumia-elevated`
- `--lumia-ink`, `--lumia-ink-soft`, `--lumia-ink-muted`
- `--lumia-border`, `--lumia-divider`
- `--lumia-accent`, `--lumia-accent-deep`, `--lumia-accent-soft`
- `--lumia-success`, `--lumia-warning`, `--lumia-danger`, `--lumia-info`

### Layout
- `--lumia-radius` (12/18/4 px), `--lumia-radius-lg` (20/28/8 px)
- `--lumia-density-scale` (0.92/1/1.08)

### Tipografía
- `--lumia-font-display` (resuelta del catálogo, ej. `"Cormorant Garamond"`)
- `--lumia-font-body` (resuelta del catálogo, ej. `"Inter Tight"`)

### Compatibilidad legacy (tokens viejos)
- `--primary` ← `palette.accentDeep`
- `--accent` ← `palette.accent`
- `--tenant-primary`, `--tenant-accent`, `--tenant-radius`, `--tenant-density`

## Reglas para añadir tokens nuevos

1. **No añadas más colores en :root** salvo que sean parte de la base
   LUMIA inmutable.
2. Si necesitas variar algo por tenant, añádelo a la interface
   `BrandingPalette` en `lib/branding-presets.ts`, defínelo en los
   defaults light/dark, y mapéalo en `paletteToCssVars()` (`--lumia-*`).
3. Los componentes deben referenciar `var(--lumia-*)` o tokens Tailwind
   registrados en `@theme inline`.
4. **Nunca** uses colores hardcoded en componentes que viven dentro del
   subtree del tenant. Siempre vía CSS var.

## Editor y wizard

- **Wizard** (primer login): `frontend/src/components/admin/OnboardingWizard.tsx`
  — 5 pasos: identity → palette → typography → layout → summary.
- **Editor** (cambios posteriores): `frontend/src/components/admin/BrandingEditor.tsx`
  — 4 paneles independientes, mismos componentes que el wizard.
- Ambos publican el draft al store `useBrandingPreview` (Zustand) para
  que el `BrandingProvider` repinte el subtree al instante. Ver
  `docs/IDENTITY_SYSTEM.md` §6.

## Endpoint de onboarding

`POST /api/admin/onboarding/complete` acepta el mismo payload que `PUT
/branding` MÁS un `tenant_name` opcional (cambia el nombre del tenant si
el admin lo modificó en el wizard) y un `extra` JSON opcional con la
paleta rica completa. Marca `users.first_login_at = now()` y a partir de
ahí el middleware del layout deja de redirigir al wizard.

## El campo `extra`

`tenant_branding.extra` es JSON. Estructura esperada:

```json
{
  "preset_id": "emerald",
  "typography_heading_id": "cormorant",
  "typography_body_id": "inter-tight",
  "layout_density_id": "comfortable",
  "layout_corner_id": "soft",
  "palette": { "bg": "...", "surface": "...", ... },
  "paletteDark": { "bg": "...", "surface": "...", ... }
}
```

Si está presente, gana sobre `preset` + `primary_color` + `accent_color`
en `flatToRich()`. Si está vacío o ausente, se deriva del preset.

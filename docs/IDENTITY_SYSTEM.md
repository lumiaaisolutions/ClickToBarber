# Sistema de Identidad — Arquitectura

> Documentación del sistema de branding por tenant tras la refundición del
> 2026-05-05 (port de la lógica de Lumina/Restaurante a LUMIA/Barbería).
>
> **Para un overview rápido**, ver `.claude-skills/branding-tokens.md`.
> **Para la lista de presets**, ver `docs/PRESETS.md`.

## 1. Visión

El admin de cada barbería puede personalizar visualmente su portal
(`/admin/*`) y su link público (`/b/{slug}`) eligiendo entre 6 paletas
curadas, 13 fuentes de display, 11 fuentes de UI, 3 niveles de densidad
y 3 estilos de esquinas — con vista previa en vivo y persistencia en backend.
La landing pública (`/`, `/precios`, `/login`) **conserva siempre la identidad
LUMIA** y nunca se contagia del branding del tenant.

## 2. Dos modelos de datos

El sistema convive con dos representaciones del branding:

### 2.1 FLAT (lo que persiste el backend)

Tabla `tenant_branding` (1-1 con `tenants`). Una fila por tenant. Campos:

| Campo | Tipo | Notas |
|-------|------|-------|
| `preset` | string(32) | id del preset (`emerald`, `champagne`, …) |
| `primary_color` | hex `#RRGGBB` | derivado de `palette.accentDeep` |
| `accent_color` | hex `#RRGGBB` | derivado de `palette.accent` |
| `font_display` | string(64) | nombre legible (ej. `"Cormorant Garamond"`) |
| `font_body` | string(64) | nombre legible (ej. `"Inter Tight"`) |
| `radius` | enum `sharp\|soft\|round` | mapeado a `cornerStyle` |
| `density` | enum `compact\|comfortable\|airy` | mapeado a `density` |
| `mode` | enum `light\|sepia\|dark` | tema base |
| `logo_url` | string(512) URL | logo del tenant |
| `cover_url` | string(512) URL | imagen de portada para `/b/{slug}` |
| `admin_display_name` | string(128) | nombre visible en `/admin` |
| `public_tagline` | string(255) | bajada en `/b/{slug}` |
| `extra` | JSON | **almacena la paleta rica completa** (ver §2.2) |

El campo `extra` es la pieza clave que evita tener que migrar el schema:
guarda el modelo rico cuando el editor lo necesita, y se ignora cuando un
caller flat clásico lee directo los campos.

### 2.2 RICH (lo que consume el UI)

Definido en `frontend/src/lib/branding-presets.ts` como `RichBranding`:

```ts
interface RichBranding {
  displayName: string;
  tagline?: string;
  logoUrl?: string;
  palette: BrandingPalette;       // 15 colores light
  paletteDark: BrandingPalette;   // 15 colores dark
  typography: { heading: BrandingHeadingFont; body: BrandingBodyFont };
  layout: { density: BrandingDensity; cornerStyle: BrandingCornerStyle };
  presetId: string;
}
```

Cada `BrandingPalette` tiene 15 tokens: `bg`, `surface`, `elevated`, `ink`,
`inkSoft`, `inkMuted`, `border`, `divider`, `accent`, `accentDeep`,
`accentSoft`, `success`, `warning`, `danger`, `info`. Le da al editor control
fino sobre fondos, tinta y estados semánticos — no sólo dos acentos.

### 2.3 Adapter (puente flat ↔ rich)

`frontend/src/lib/branding-adapter.ts`:

- `flatToRich(flat)` — reconstruye el modelo rico. Prioridad:
  1. Si `extra.palette` existe → usa esa paleta tal cual.
  2. Si no, deriva del `preset` aplicando overrides del catálogo sobre la
     paleta default.
  3. Si tampoco, al menos respeta `primary_color` / `accent_color`.
- `richToFlat(rich, baseFlat?)` — convierte para persistir. Pone los acentos
  en `primary_color`/`accent_color`, mapea fonts a su nombre legible, e
  infiere `mode` (heurística: bg muy oscuro → dark; champagne/terracotta →
  sepia; resto → light). El campo `extra` se popula con la paleta completa
  + ids canónicos de typography/layout/preset.

Esta capa es el motivo por el cual **cualquier cliente legacy del API
(reportes, integraciones externas) sigue funcionando** sin ver el `extra`.

## 3. El catálogo de presets

6 paletas curadas, cada una con variante light **y** dark sincronizadas.
Definidas en `lib/branding-presets.ts` exportadas como `PALETTE_PRESETS`.

| id | Nombre | Para |
|------|--------|------|
| `champagne` | Champagne | Cálido y discreto — clásico premium old money |
| `emerald` | Esmeralda | Verde botella + oro mate — barbería de Mayfair (default LUMIA) |
| `terracotta` | Terracota | Cálido y artesanal — barberías mexicanas/mediterráneas |
| `midnight` | Medianoche | Sofisticado y nocturno — barbería de autor |
| `rose` | Rosa té | Refinado y boutique — salones unisex |
| `forest` | Bosque | Sobrio y profundo — barbershops tradicionales |

Detalles de colores exactos en `docs/PRESETS.md`.

Cuando el usuario clicka un preset, el editor ejecuta:

```ts
palette = { ...DEFAULT_PALETTE_LIGHT, ...preset.light }
paletteDark = { ...DEFAULT_PALETTE_DARK, ...preset.dark }
```

Así el preset funciona como **reset** — descarta cualquier customización
manual previa.

## 4. Catálogo de fuentes

### 4.1 Display (encabezados) — 13 opciones

Cormorant Garamond (default), Fraunces, Playfair Display, DM Serif Display,
Lora, Libre Baskerville, Marcellus, Prata, Spectral, Syne, Young Serif,
Instrument Serif, Inter.

### 4.2 Body / UI — 11 opciones

Inter Tight (default), Inter, Manrope, DM Sans, Poppins, Work Sans,
Space Grotesk, Plus Jakarta Sans, Outfit, Lexend, Nunito Sans.

Cada entrada lleva su **`googleHref`** (URL del CSS de Google Fonts). El
`BrandingProvider` carga sólo el par activo; el `TypographyPanel` precarga
**todas** al montar para que cada `FontOption` muestre su sample en la
familia real (sin esto cae a Georgia).

## 5. Componentes y ficheros

```
frontend/src/
├── lib/
│   ├── branding-presets.ts        ← catálogo (presets, fuentes, layout)
│   ├── branding-adapter.ts        ← flat ↔ rich
│   └── branding-api.ts            ← fetchAdminBranding / fetchPublicBranding
├── store/
│   └── branding-preview-store.ts  ← Zustand: draft del editor
├── components/
│   ├── branding/
│   │   └── BrandingProvider.tsx   ← aplica vars CSS scoped
│   └── admin/
│       ├── BrandingEditor.tsx     ← 4 paneles + preview card
│       └── OnboardingWizard.tsx   ← 5 pasos: identity→palette→typography→layout→summary
└── app/
    ├── admin/identity/page.tsx    ← Server Component que monta BrandingEditor
    └── admin/onboarding/page.tsx  ← Server Component que monta el wizard

backend/app/Http/Admin/Controllers/BrandingController.php  ← acepta `extra`
```

## 6. Live preview store (Zustand)

`store/branding-preview-store.ts` expone `useBrandingPreview()` con tres
operaciones: `setPreview`, `clearPreview`, y la prop `preview`.

Mientras el admin edita en `/admin/identity` o en el wizard, cada cambio
del estado local del editor se publica al store. El `BrandingProvider`
prioriza el draft sobre el branding persistido — todo el subtree
(sidebar, header, cards, botones) repinta en vivo. Al guardar o al
desmontar el editor, `clearPreview()` lo limpia y vuelve al persistido.

**No persiste** entre recargas — al refrescar la página el preview muere.

## 7. BrandingProvider

`components/branding/BrandingProvider.tsx`. Server-friendly: lo monta el
layout `/admin` (post-login) y la ruta pública `/b/{slug}`.

Lo que aplica al wrapper `<div data-tenant-branding>`:

1. **CSS vars `--lumia-*` para la paleta**: 15 vars (bg/surface/.../info)
   inyectadas via `style={{}}` inline. Reaccionan a `mode === "dark"` para
   intercambiar `palette` por `paletteDark`.
2. **Radio + densidad**: `--lumia-radius`, `--lumia-radius-lg`,
   `--lumia-density-scale`.
3. **Fuentes**: `--lumia-font-display`, `--lumia-font-body` con la cssFamily
   resuelta del catálogo.
4. **Compatibilidad legacy**: `--primary`, `--accent`, `--tenant-primary`,
   `--tenant-accent`, `--tenant-radius`, `--tenant-density` para que los
   componentes viejos sigan funcionando.

Además, en `useEffect` inyecta los `<link rel="stylesheet">` de Google
Fonts del par tipográfico (marcados con `data-lumia-brand-font="1"`) y
limpia los obsoletos cuando el par cambia.

**Por qué scoped y no `:root`**: ver `.claude-skills/branding-tokens.md`.

## 8. API (contrato)

| Método y ruta | Auth | Body / Query | Devuelve |
|---------------|------|--------------|----------|
| `GET /api/admin/branding` | Bearer | — | `{ data: FlatBranding }` |
| `PUT /api/admin/branding` | Bearer (admin/manager) | `FlatBranding` parcial (incluye `extra`) | `{ data: FlatBranding }` |
| `POST /api/admin/onboarding/complete` | Bearer | `FlatBranding` + `tenant_name` opcional | `{ ok, first_login_at }` |
| `GET /api/tenant/{slug}/branding` | público | — | `{ data: FlatBranding }` (sin `admin_display_name`) |

El backend valida `extra` como `array` (Laravel deserializa JSON
automáticamente) y lo guarda como JSON gracias al cast `'extra' => 'array'`
en el modelo.

## 9. Cómo extender

### Agregar un nuevo preset

1. En `lib/branding-presets.ts`, añadir entrada en `PALETTE_PRESETS` con
   `id`, `name`, `description`, `light` (overrides) y `dark` (overrides).
2. Documentar en `docs/PRESETS.md` con paleta y caso de uso.
3. **No** hace falta tocar backend — el `id` se persiste como string libre
   en `tenant_branding.preset`.

### Agregar una fuente nueva

1. En `lib/branding-presets.ts`, agregar a `HEADING_FONTS` o `BODY_FONTS`
   (id, label, cssFamily, googleHref).
2. Si el caller flat persistido necesita reconocer el nombre legible,
   actualizar `headingNameToId()` o `bodyNameToId()` en `branding-adapter.ts`.

### Agregar un nuevo token semántico

Si necesitas un nuevo color (ej. `surfaceMutedHover`):

1. Añadir al tipo `BrandingPalette` en `lib/branding-presets.ts`.
2. Añadirlo a `DEFAULT_PALETTE_LIGHT` y `DEFAULT_PALETTE_DARK`.
3. Añadirlo a cada preset si quieres customizar (o se hereda del default).
4. Mapearlo en `paletteToCssVars()` (`--lumia-surface-muted-hover`).
5. Usar `var(--lumia-surface-muted-hover)` o token Tailwind donde corresponda.

## 10. Reglas duras

- **NO** sobrescribas `:root` global. Siempre scoped al `<BrandingProvider>`.
- **NO** uses colores hardcoded dentro del subtree del tenant. Usa
  `var(--lumia-*)` o tokens Tailwind.
- El `BrandingProvider` envuelve **únicamente** `/admin/*` y `/b/{slug}`.
  Nunca envuelve la landing pública.
- Cuando un Server Component cargue branding, usa `fetchAdminBranding()` /
  `fetchPublicBranding(slug)` con `cache: 'no-store'` para que el SSR
  refleje el estado actual.
- El campo `extra` puede ser `null` — el adapter lo maneja. No asumir que
  siempre hay paleta rica guardada.

## 11. Hidratación segura

El `BrandingProvider` lee del live-preview store (`useBrandingPreview`) en
el cliente. Server-side el store está vacío, así que el primer render
matchea al persistido. Cuando el cliente hidrata y abre el editor, el
preview se activa **después** de la hidratación inicial — sin mismatch.

El `Preloader` también respeta esta regla: el initial state es siempre
`"visible"` (idéntico server/client) y la decisión basada en `sessionStorage`
ocurre en `useEffect`. Ver §10 del `claude.md` (entrada 2026-05-05).

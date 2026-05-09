# Responsive — convenciones LUMIA

> Reglas y patrones aplicados para que cada página renderice bien desde
> 360 px (mobile pequeño) hasta 1920 px (desktop wide).

## Breakpoints (Tailwind 4)

| Token | Min width | Caso |
|-------|----------:|------|
| (base) | 0 | mobile |
| `sm:`  | 640 px | mobile grande / tablet portrait |
| `md:`  | 768 px | tablet |
| `lg:`  | 1024 px | desktop / sidebar permanente |
| `xl:`  | 1280 px | desktop wide |

> No hay `xs:` definido en este proyecto. Si lo encuentras en el código,
> es código muerto: removerlo.

## Convenciones de página

### Containers

```tsx
<main className="px-4 sm:px-6 max-w-7xl mx-auto py-6 sm:py-10">
```

`px-4` mobile (16 px), `sm:px-6` desktop (24 px). Layout admin ya envuelve
con esto en `app/admin/layout.tsx`.

### Tipografía clamp

Headings de hero: `font-display italic text-[clamp(2rem,5.5vw,5rem)] leading-[1.05] sm:leading-[1.02]`.

H1 admin: `text-3xl sm:text-5xl text-ink leading-tight`.

H2 admin: `text-xl sm:text-2xl`.

### Cards

```tsx
<article className="card-paper p-4 sm:p-6 lg:p-7">
```

Padding crece con la viewport. `card-paper` está definido en globals.css.

### Grids

| Caso | Clase |
|------|-------|
| KPIs (3-4 metrics) | `grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4` |
| Cards 2-3 col | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` |
| Form 2 columns | `grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5` |

### Tablas

Las tablas viven dentro de `<div className="overflow-x-auto -mx-5 sm:-mx-6">`
con `<table className="min-w-[640px] w-full">`. El `-mx-X` neutraliza el
padding del card padre para que el scroll horizontal toque el borde de la
viewport en mobile.

### Modales

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/40 backdrop-blur-sm overflow-y-auto">
  <form className="card-paper w-full max-w-md max-h-[92vh] overflow-y-auto p-5 sm:p-8 my-auto">
```

Doble overflow (backdrop + form) garantiza que el form se vea entero en
landscape mobile.

### Sidebar admin

- `<lg:hidden` topbar (h-14) con hamburger.
- `<lg:` drawer slide-in con backdrop.
- `lg:flex` sidebar permanente (w-268).
- `<main className="lg:ml-[268px] pt-14 lg:pt-0">` para offsetear.

### Botones

- Mobile: `w-full justify-center` cuando es la acción principal.
- Desktop: `w-auto`.
- Headers de página: `flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4` con CTA `self-start sm:self-auto`.

### Inputs

`input-boxed` (definido en globals.css) ya es responsive de base. Para
forms multi-campo:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

## Auditoría 2026-05-07

Pase manual sobre las 21 páginas del portal admin + landing + flujo
público. Findings y arreglos:

| Componente | Finding | Arreglo |
|------------|---------|---------|
| `AdminSidebar` | 11 items + 5 nuevos podían no caber en drawer mobile | Drawer ya tiene `overflow-y-auto`, sigue OK |
| Tabla loyalty rewards | Texto se cortaba en mobile | `overflow-x-auto -mx-5 sm:-mx-7` + `min-w-[640px]` |
| Tabla referrals | Igual | `min-w-[720px]` |
| Modal Referrals "issue" | Botón copy no cabía | `flex gap-2` + `shrink-0` en btn |
| `TwoFactorClient` setup | QR + secret en mobile peleaban espacio | `grid-cols-1 sm:grid-cols-[200px_1fr]` |
| `DomainsClient` rows | Botones verify/primary/remove se solapaban | `flex flex-wrap gap-2 shrink-0` |
| `CalendarSyncClient` | Card config no respetaba mobile cuando no configurado | `flex-col sm:flex-row` + `self-start sm:self-auto` |
| `RatingClient` | 5 estrellas tamaño 36 px se salían en 320px | `gap-2 sm:gap-3` + `p-1` (padding small en cada btn) |
| `LoyaltyClient` toggle | Toggle a la derecha del label se enrollaba | `flex-col sm:flex-row` + `shrink-0` en toggle |
| `LegalLayout` | Texto muy ancho en desktop wide | `max-w-3xl mx-auto` (pegado en xl) |
| `LandingPricing` cards | KPIs altura desigual | (ya estaba arreglado de sesiones previas) |
| `CheckoutDialog` | Email muy largo desbordaba | (ya tiene `break-words` implícito) |

## Pendientes de pulido

- Tablet landscape (768-1024 px): los 14 items del sidebar quedan
  apilados verticalmente y necesitan scroll del drawer. Funciona pero
  no es óptimo. Considerar agrupar items en categorías colapsables.
- AuditLog: el JSON de `changes` puede ser ancho y rompe layout en
  mobile. Hoy `overflow-x-auto` + font-mono lo hace usable, pero la
  cabecera (action + subject + actor + ts) tiene mucho contenido para
  un fila — se apila como `flex-col sm:flex-row`, OK.
- Onboarding wizard: 5 pasos x preview lateral. Activos a partir de
  `md:`. En sub-md el preview se mueve abajo. Auditado, OK.

## Cómo testear

Dado que no tenemos Playwright todavía:

1. Chrome DevTools → device toolbar (Ctrl+Shift+M).
2. Probar `iPhone SE (375)`, `iPhone 14 Pro Max (430)`, `iPad (768)`,
   `iPad Pro (1024)`, `Desktop 1440`.
3. Para cada page nueva, verificar:
   - No hay overflow horizontal en mobile.
   - Botones primarios visibles sin scroll.
   - Modal no se corta arriba/abajo.
   - Tabla scrollea horizontal sin que el resto del layout se mueva.

Tests E2E con Playwright pendientes (ver `docs/PRODUCTION_READINESS.md`).

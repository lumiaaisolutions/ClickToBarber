# LUMIA — Presets de identidad

Seis paletas curadas que sirven como semilla en el wizard de onboarding.
Cada preset tiene una **variante light y una dark** sincronizadas, y al
clickarse hace reset de cualquier customización manual previa (overrides
totales sobre la paleta default). El admin puede ajustar tokens
individuales después desde `/admin/identity` → "Personalizar colores
manualmente".

> **Catálogo canónico**: `frontend/src/lib/branding-presets.ts` exportando
> la constante `PALETTE_PRESETS`. Cualquier cambio se hace ahí — este
> documento es el espejo human-readable.

## 1. Champagne — `champagne`

Cálido y discreto. El clásico premium old money. Buena baseline neutra.

| Token | Light | Dark |
|-------|-------|------|
| bg | `#FAFAF7` | `#131311` |
| surface | `#FFFFFF` | `#1C1C19` |
| elevated | `#F4F2EC` | `#232320` |
| border | `#ECECE8` | `#2D2D29` |
| accent | `#B8A88A` | `#C9B89A` |
| accent-deep | `#8A7A5C` | `#E0CFAA` |
| accent-soft | `#EDE7DA` | `#2E2820` |

**Para:** clubs privados, atelier urbano serio, branding corporativo soft.
**Sensación:** marfil, papel manila, latón pulido bajo luz cálida.

## 2. Esmeralda — `emerald`

Verde botella + oro mate envejecido. Identidad insignia de LUMIA y default
para tenants nuevos.

| Token | Light | Dark |
|-------|-------|------|
| bg | `#FBF7EE` | `#0E1014` |
| surface | `#F5EFE0` | `#15171C` |
| elevated | `#EDE5D2` | `#1B1E25` |
| border | `#E4DCC6` | `#262A33` |
| accent | `#B8935E` | `#C9A878` |
| accent-deep | `#1F3D2B` | `#2D5240` |
| accent-soft | `#E4DCC6` | `#1A2218` |

**Para:** barberías de Mayfair, ateliers de autor, clubs masculinos.
**Sensación:** cuero verde antiguo, biblioteca privada, latón con pátina.

## 3. Terracota — `terracotta`

Cálido y artesanal. Funciona perfecto para identidades latinas y
mediterráneas con calidez visible.

| Token | Light | Dark |
|-------|-------|------|
| bg | `#FBF6F2` | `#1A1311` |
| surface | `#FFFFFF` | `#221A17` |
| elevated | `#F5ECE4` | `#2C211C` |
| border | `#EFE0D2` | `#3A2A22` |
| accent | `#B86E50` | `#D08C72` |
| accent-deep | `#8A4C36` | `#E5A38A` |
| accent-soft | `#F0DDD3` | `#3A2218` |

**Para:** barberías mexicanas, mediterráneas, espacios con madera/yeso.
**Sensación:** barro cocido al sol, especias, cuero rojizo.

## 4. Medianoche — `midnight`

Sofisticado y nocturno. La opción más formal del catálogo, ideal cuando
el shop opera con luz baja y atmósfera de bar/club.

| Token | Light | Dark |
|-------|-------|------|
| bg | `#F5F6FA` | `#10131A` |
| surface | `#FFFFFF` | `#181B25` |
| elevated | `#EDEFF6` | `#1F2330` |
| border | `#E1E4EE` | `#2A2F3E` |
| accent | `#3F4B6E` | `#8E9DC9` |
| accent-deep | `#2A3454` | `#AAB7DC` |
| accent-soft | `#DEE2EE` | `#1B2238` |

**Para:** barberías de autor con horario nocturno, lounges con barber.
**Sensación:** terciopelo navy, luz baja, plata vieja.

## 5. Rosa té — `rose`

Refinado y boutique. Cubre el segmento de salones unisex y barberías que
combinan corte masculino con servicios femeninos.

| Token | Light | Dark |
|-------|-------|------|
| bg | `#FBF5F6` | `#181113` |
| surface | `#FFFFFF` | `#211719` |
| elevated | `#F5E9EC` | `#2B1E22` |
| border | `#EFDADE` | `#3A272D` |
| accent | `#B97A85` | `#D69BA5` |
| accent-deep | `#8C525D` | `#E5B4BD` |
| accent-soft | `#F1DCE0` | `#391E22` |

**Para:** salones unisex, barberías-spa, conceptos boutique con barba+pelo.
**Sensación:** rosa té antiguo, espejo dorado, bizcocho de almendra.

## 6. Bosque — `forest`

Sobrio y profundo. Más frío y "outdoorsy" que Esmeralda — funciona para
shops orgánicos, sostenibles, con identidad eco/naturaleza.

| Token | Light | Dark |
|-------|-------|------|
| bg | `#F4F7F4` | `#10141C` |
| surface | `#FFFFFF` | `#161D1A` |
| elevated | `#EAF0EA` | `#1E2722` |
| border | `#DEE8DD` | `#28342D` |
| accent | `#3F6B4E` | `#7DAD8B` |
| accent-deep | `#274836` | `#A0CCAD` |
| accent-soft | `#D7E5DB` | `#162920` |

**Para:** barbershops tradicionales, conceptos eco, hombres outdoor.
**Sensación:** musgo seco, madera verde, lluvia escocesa.

## Cómo añadir un preset nuevo

1. **Edita el catálogo**: `frontend/src/lib/branding-presets.ts`.
   Añade un objeto a `PALETTE_PRESETS` con `id`, `name`, `description`,
   `light` (overrides parciales) y `dark` (overrides parciales). Sólo
   define los tokens que cambian respecto a la paleta default.
2. **Documenta aquí** con la tabla de colores y caso de uso.
3. No hace falta tocar backend — `tenant_branding.preset` es string libre.

## Tokens estructurales (no son presets)

Ortogonales al preset, también editables desde el wizard / `/admin/identity`:

- **Densidad**: `compact` (0.92×) · `comfortable` (1×) · `spacious` (1.08×)
  → Se aplica como `--lumia-density-scale` y como atributo `data-tenant-density`.
- **Esquinas**: `soft` (12px / 20px) · `rounded` (18px / 28px) · `squared`
  (4px / 8px) → `--lumia-radius` y `--lumia-radius-lg`.
- **Modo**: `light` · `sepia` · `dark` → atributo `data-tenant-mode` en el
  wrapper. El `BrandingProvider` intercambia `palette` ↔ `paletteDark`
  según el modo.

## Los 4 presets viejos (deprecated)

Antes del 2026-05-05 había 4 presets (`old-money-emerald`, `ivory-brass`,
`navy-classic`, `carbon-premium`) con sólo `primary`+`accent`. El nuevo
sistema los reemplaza con 6 paletas más completas. **Los slugs viejos
siguen aceptados** por el backend (campo string libre) pero el `flatToRich`
del adapter los mapea al default si no encuentra coincidencia. Para
consistencia, migra tenants viejos a un preset nuevo en cuanto puedas:

| Preset viejo | Equivalente nuevo |
|--------------|-------------------|
| `old-money-emerald` | `emerald` |
| `ivory-brass` | `champagne` |
| `navy-classic` | `midnight` |
| `carbon-premium` | `forest` (modo dark) |

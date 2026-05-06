/**
 * Adaptador entre el shape FLAT del API (lo que persiste el backend en
 * tabla `tenant_branding`) y el modelo RICO que usa el editor / provider.
 *
 * El backend acepta los campos planos + un `extra` JSON donde guardamos
 * la paleta completa (palette + paletteDark) — eso le da al UI control fino
 * sin requerir migración de schema.
 */
import {
  applyAccentPreset,
  BODY_FONTS,
  BrandingBodyFont,
  BrandingCornerStyle,
  BrandingDensity,
  BrandingHeadingFont,
  BrandingPalette,
  DEFAULT_PALETTE_DARK,
  DEFAULT_PALETTE_LIGHT,
  defaultRichBranding,
  findPreset,
  HEADING_FONTS,
  PALETTE_PRESETS,
  type RichBranding,
} from "@/lib/branding-presets";

/** Shape persistido por el backend. */
export interface FlatBranding {
  preset: string;
  primary_color: string;
  accent_color: string;
  font_display: string;
  font_body: string;
  radius: "sharp" | "soft" | "round";
  density: "compact" | "comfortable" | "airy";
  mode: "light" | "sepia" | "dark";
  logo_url: string | null;
  cover_url?: string | null;
  public_tagline?: string | null;
  admin_display_name?: string | null;
  extra?: {
    palette?: BrandingPalette;
    paletteDark?: BrandingPalette;
    typography_heading_id?: BrandingHeadingFont;
    typography_body_id?: BrandingBodyFont;
    layout_density_id?: BrandingDensity;
    layout_corner_id?: BrandingCornerStyle;
    preset_id?: string;
  } | null;
}

const RADIUS_TO_CORNER: Record<FlatBranding["radius"], BrandingCornerStyle> = {
  sharp: "squared",
  soft: "soft",
  round: "rounded",
};

const CORNER_TO_RADIUS: Record<BrandingCornerStyle, FlatBranding["radius"]> = {
  squared: "sharp",
  soft: "soft",
  rounded: "round",
};

const DENSITY_FLAT_TO_RICH: Record<FlatBranding["density"], BrandingDensity> = {
  compact: "compact",
  comfortable: "comfortable",
  airy: "spacious",
};

const DENSITY_RICH_TO_FLAT: Record<BrandingDensity, FlatBranding["density"]> = {
  compact: "compact",
  comfortable: "comfortable",
  spacious: "airy",
};

/** Mapea legacy font name (string libre) al id del catálogo. */
function headingNameToId(name: string): BrandingHeadingFont {
  const lower = name.toLowerCase();
  // Match exacto por label fuzzy o cssFamily contiene
  for (const f of HEADING_FONTS) {
    if (lower.includes(f.id) || f.cssFamily.toLowerCase().includes(lower.split(" ")[0])) {
      return f.id;
    }
  }
  if (lower.includes("cormorant")) return "cormorant";
  if (lower.includes("playfair")) return "playfair-display";
  if (lower.includes("fraunces")) return "fraunces";
  return "cormorant";
}

function bodyNameToId(name: string): BrandingBodyFont {
  const lower = name.toLowerCase();
  if (lower.includes("inter tight")) return "inter-tight";
  if (lower.includes("inter")) return "inter";
  if (lower.includes("manrope")) return "manrope";
  if (lower.includes("dm sans")) return "dm-sans";
  if (lower.includes("poppins")) return "poppins";
  if (lower.includes("work")) return "work-sans";
  if (lower.includes("space")) return "space-grotesk";
  if (lower.includes("jakarta")) return "plus-jakarta-sans";
  if (lower.includes("outfit")) return "outfit";
  if (lower.includes("lexend")) return "lexend";
  if (lower.includes("nunito")) return "nunito-sans";
  return "inter-tight";
}

/** Construye RichBranding a partir del shape persistido. */
export function flatToRich(flat: FlatBranding | null | undefined): RichBranding {
  if (!flat) return defaultRichBranding("Mi barbería");

  // Si el extra trae la paleta completa, la usamos. Si no, derivamos del preset
  // y los colores planos.
  const extraPaletteLight = flat.extra?.palette;
  const extraPaletteDark = flat.extra?.paletteDark;

  let palette = DEFAULT_PALETTE_LIGHT;
  let paletteDark = DEFAULT_PALETTE_DARK;

  const presetCandidate = flat.extra?.preset_id ?? flat.preset;
  const preset = findPreset(presetCandidate);

  if (preset) {
    palette = applyAccentPreset(DEFAULT_PALETTE_LIGHT, preset.light);
    paletteDark = applyAccentPreset(DEFAULT_PALETTE_DARK, preset.dark);
  }

  // El shape extra (si existe) gana sobre el preset.
  if (extraPaletteLight) palette = extraPaletteLight;
  if (extraPaletteDark) paletteDark = extraPaletteDark;

  // Si no hay preset ni extra, al menos respetar primary_color y accent_color.
  if (!preset && !extraPaletteLight) {
    palette = {
      ...palette,
      accent: flat.accent_color || palette.accent,
      accentDeep: flat.primary_color || palette.accentDeep,
    };
    paletteDark = {
      ...paletteDark,
      accent: flat.accent_color || paletteDark.accent,
      accentDeep: flat.primary_color || paletteDark.accentDeep,
    };
  }

  return {
    displayName: flat.admin_display_name ?? "Mi barbería",
    tagline: flat.public_tagline ?? undefined,
    logoUrl: flat.logo_url ?? undefined,
    palette,
    paletteDark,
    typography: {
      heading: flat.extra?.typography_heading_id ?? headingNameToId(flat.font_display),
      body: flat.extra?.typography_body_id ?? bodyNameToId(flat.font_body),
    },
    layout: {
      density: flat.extra?.layout_density_id ?? DENSITY_FLAT_TO_RICH[flat.density],
      cornerStyle: flat.extra?.layout_corner_id ?? RADIUS_TO_CORNER[flat.radius],
    },
    presetId: presetCandidate,
  };
}

/** Convierte el modelo rico al shape que persiste el backend. */
export function richToFlat(rich: RichBranding, baseFlat?: FlatBranding | null): FlatBranding {
  const headingFont = HEADING_FONTS.find((f) => f.id === rich.typography.heading);
  const bodyFont = BODY_FONTS.find((f) => f.id === rich.typography.body);
  const matchedPreset = PALETTE_PRESETS.find((p) => p.id === rich.presetId);

  // Mode heurística: si la mayoría de superficies son oscuras → "dark", si tinta cálida → "sepia", si no "light".
  const inferMode = (): FlatBranding["mode"] => {
    const bg = rich.palette.bg.toLowerCase();
    if (rich.presetId === "midnight" || /^#0|^#1[0-3]/i.test(bg)) return "dark";
    if (rich.presetId === "champagne" || rich.presetId === "terracotta") return "sepia";
    return "light";
  };

  return {
    preset: matchedPreset?.id ?? rich.presetId ?? "emerald",
    primary_color: rich.palette.accentDeep,
    accent_color: rich.palette.accent,
    font_display: headingFont?.cssFamily.split(",")[0].replace(/"/g, "") ?? "Cormorant Garamond",
    font_body: bodyFont?.cssFamily.split(",")[0].replace(/"/g, "") ?? "Inter Tight",
    radius: CORNER_TO_RADIUS[rich.layout.cornerStyle],
    density: DENSITY_RICH_TO_FLAT[rich.layout.density],
    mode: baseFlat?.mode ?? inferMode(),
    logo_url: rich.logoUrl ?? null,
    cover_url: baseFlat?.cover_url ?? null,
    public_tagline: rich.tagline ?? null,
    admin_display_name: rich.displayName ?? null,
    extra: {
      palette: rich.palette,
      paletteDark: rich.paletteDark,
      typography_heading_id: rich.typography.heading,
      typography_body_id: rich.typography.body,
      layout_density_id: rich.layout.density,
      layout_corner_id: rich.layout.cornerStyle,
      preset_id: rich.presetId,
    },
  };
}

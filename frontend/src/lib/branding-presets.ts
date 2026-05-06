/**
 * Catálogo de presets, fuentes, densidad y radios para el sistema de
 * identidad visual. Adaptado de Lumina (Restaurante) al contexto barbería.
 *
 * El UI consume este archivo; el adaptador (`branding-adapter.ts`)
 * lo traduce a/desde el shape flat que persiste el backend.
 */

export type BrandingHeadingFont =
  | "cormorant"
  | "fraunces"
  | "playfair-display"
  | "dm-serif-display"
  | "lora"
  | "libre-baskerville"
  | "marcellus"
  | "prata"
  | "spectral"
  | "syne"
  | "young-serif"
  | "instrument-serif"
  | "inter";

export type BrandingBodyFont =
  | "inter"
  | "inter-tight"
  | "manrope"
  | "dm-sans"
  | "poppins"
  | "work-sans"
  | "space-grotesk"
  | "plus-jakarta-sans"
  | "outfit"
  | "lexend"
  | "nunito-sans";

export type BrandingDensity = "compact" | "comfortable" | "spacious";
export type BrandingCornerStyle = "soft" | "rounded" | "squared";

export interface BrandingPalette {
  bg: string;
  surface: string;
  elevated: string;
  ink: string;
  inkSoft: string;
  inkMuted: string;
  border: string;
  divider: string;
  accent: string;
  accentDeep: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface RichBranding {
  displayName: string;
  tagline?: string;
  logoUrl?: string;
  palette: BrandingPalette;
  paletteDark: BrandingPalette;
  typography: { heading: BrandingHeadingFont; body: BrandingBodyFont };
  layout: { density: BrandingDensity; cornerStyle: BrandingCornerStyle };
  presetId: string;
}

/** Paleta light por defecto — old money cálido. */
export const DEFAULT_PALETTE_LIGHT: BrandingPalette = {
  bg: "#FBF7EE",
  surface: "#F5EFE0",
  elevated: "#EDE5D2",
  ink: "#1A1F1B",
  inkSoft: "#4A4F45",
  inkMuted: "#8A8B7E",
  border: "rgba(26,31,27,0.16)",
  divider: "rgba(26,31,27,0.08)",
  accent: "#B8935E",
  accentDeep: "#8E6D40",
  accentSoft: "#EDE5D2",
  success: "#3F6B4F",
  warning: "#B8853A",
  danger: "#9C4039",
  info: "#3F5A7A",
};

/** Paleta dark por defecto — carbón premium. */
export const DEFAULT_PALETTE_DARK: BrandingPalette = {
  bg: "#0E1014",
  surface: "#15171C",
  elevated: "#1B1E25",
  ink: "#F4EFE3",
  inkSoft: "#B8B3A6",
  inkMuted: "#7A766E",
  border: "rgba(244,239,227,0.14)",
  divider: "rgba(244,239,227,0.07)",
  accent: "#C9A878",
  accentDeep: "#E0C190",
  accentSoft: "#262017",
  success: "#7BA08A",
  warning: "#D2A458",
  danger: "#C77067",
  info: "#7B98C0",
};

type PresetOverrides = Partial<
  Pick<
    BrandingPalette,
    | "bg"
    | "surface"
    | "elevated"
    | "border"
    | "divider"
    | "accent"
    | "accentDeep"
    | "accentSoft"
  >
>;

/**
 * 6 presets curados — same paleta que Lumina pero descripciones de barbería.
 * Cada preset toca acentos + tinta sutil de superficies para que el cambio
 * sea visible en toda la página sin romper la legibilidad.
 */
export const PALETTE_PRESETS: {
  id: string;
  name: string;
  description: string;
  light: PresetOverrides;
  dark: PresetOverrides;
}[] = [
  {
    id: "champagne",
    name: "Champagne",
    description: "Cálido y discreto — el clásico premium old money.",
    light: {
      bg: "#FAFAF7", surface: "#FFFFFF", elevated: "#F4F2EC",
      border: "#ECECE8", divider: "#E8E6E0",
      accent: "#B8A88A", accentDeep: "#8A7A5C", accentSoft: "#EDE7DA",
    },
    dark: {
      bg: "#131311", surface: "#1C1C19", elevated: "#232320",
      border: "#2D2D29", divider: "#262623",
      accent: "#C9B89A", accentDeep: "#E0CFAA", accentSoft: "#2E2820",
    },
  },
  {
    id: "emerald",
    name: "Esmeralda",
    description: "Verde botella y oro mate — barbería de Mayfair.",
    light: {
      bg: "#FBF7EE", surface: "#F5EFE0", elevated: "#EDE5D2",
      border: "#E4DCC6", divider: "#EDE5D2",
      accent: "#B8935E", accentDeep: "#1F3D2B", accentSoft: "#E4DCC6",
    },
    dark: {
      bg: "#0E1014", surface: "#15171C", elevated: "#1B1E25",
      border: "#262A33", divider: "#1F232B",
      accent: "#C9A878", accentDeep: "#2D5240", accentSoft: "#1A2218",
    },
  },
  {
    id: "terracotta",
    name: "Terracota",
    description: "Cálido y artesanal — barberías mexicanas y mediterráneas.",
    light: {
      bg: "#FBF6F2", surface: "#FFFFFF", elevated: "#F5ECE4",
      border: "#EFE0D2", divider: "#E9D9C9",
      accent: "#B86E50", accentDeep: "#8A4C36", accentSoft: "#F0DDD3",
    },
    dark: {
      bg: "#1A1311", surface: "#221A17", elevated: "#2C211C",
      border: "#3A2A22", divider: "#33241D",
      accent: "#D08C72", accentDeep: "#E5A38A", accentSoft: "#3A2218",
    },
  },
  {
    id: "midnight",
    name: "Medianoche",
    description: "Sofisticado y nocturno — barbería de autor.",
    light: {
      bg: "#F5F6FA", surface: "#FFFFFF", elevated: "#EDEFF6",
      border: "#E1E4EE", divider: "#D8DDEA",
      accent: "#3F4B6E", accentDeep: "#2A3454", accentSoft: "#DEE2EE",
    },
    dark: {
      bg: "#10131A", surface: "#181B25", elevated: "#1F2330",
      border: "#2A2F3E", divider: "#252A39",
      accent: "#8E9DC9", accentDeep: "#AAB7DC", accentSoft: "#1B2238",
    },
  },
  {
    id: "rose",
    name: "Rosa té",
    description: "Refinado y boutique — salones unisex y elegantes.",
    light: {
      bg: "#FBF5F6", surface: "#FFFFFF", elevated: "#F5E9EC",
      border: "#EFDADE", divider: "#E8CCD2",
      accent: "#B97A85", accentDeep: "#8C525D", accentSoft: "#F1DCE0",
    },
    dark: {
      bg: "#181113", surface: "#211719", elevated: "#2B1E22",
      border: "#3A272D", divider: "#322128",
      accent: "#D69BA5", accentDeep: "#E5B4BD", accentSoft: "#391E22",
    },
  },
  {
    id: "forest",
    name: "Bosque",
    description: "Sobrio y profundo — barbershops tradicionales.",
    light: {
      bg: "#F4F7F4", surface: "#FFFFFF", elevated: "#EAF0EA",
      border: "#DEE8DD", divider: "#D5E1D3",
      accent: "#3F6B4E", accentDeep: "#274836", accentSoft: "#D7E5DB",
    },
    dark: {
      bg: "#10141C", surface: "#161D1A", elevated: "#1E2722",
      border: "#28342D", divider: "#222C26",
      accent: "#7DAD8B", accentDeep: "#A0CCAD", accentSoft: "#162920",
    },
  },
];

/** Familias para encabezados (display). */
export const HEADING_FONTS: {
  id: BrandingHeadingFont;
  label: string;
  cssFamily: string;
  googleHref: string | null;
}[] = [
  {
    id: "cormorant",
    label: "Cormorant — refinada y aristocrática",
    cssFamily: '"Cormorant Garamond", Georgia, serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400..700;1,400..700&display=swap",
  },
  {
    id: "fraunces",
    label: "Fraunces — sereno y editorial",
    cssFamily: '"Fraunces", Georgia, serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..600&display=swap",
  },
  {
    id: "playfair-display",
    label: "Playfair Display — clásico y elegante",
    cssFamily: '"Playfair Display", Georgia, serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400..700&display=swap",
  },
  {
    id: "dm-serif-display",
    label: "DM Serif Display — robusto y moderno",
    cssFamily: '"DM Serif Display", Georgia, serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap",
  },
  {
    id: "lora",
    label: "Lora — equilibrada y amable",
    cssFamily: '"Lora", Georgia, serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Lora:wght@400..700&display=swap",
  },
  {
    id: "libre-baskerville",
    label: "Libre Baskerville — tradicional y formal",
    cssFamily: '"Libre Baskerville", Georgia, serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap",
  },
  {
    id: "marcellus",
    label: "Marcellus — esbelta, inscripcional",
    cssFamily: '"Marcellus", Georgia, serif',
    googleHref: "https://fonts.googleapis.com/css2?family=Marcellus&display=swap",
  },
  {
    id: "prata",
    label: "Prata — alta y delicada (boutique)",
    cssFamily: '"Prata", Georgia, serif',
    googleHref: "https://fonts.googleapis.com/css2?family=Prata&display=swap",
  },
  {
    id: "spectral",
    label: "Spectral — editorial pausado",
    cssFamily: '"Spectral", Georgia, serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Spectral:wght@400;500;600&display=swap",
  },
  {
    id: "syne",
    label: "Syne — contemporánea y geométrica",
    cssFamily: '"Syne", system-ui, sans-serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Syne:wght@500..800&display=swap",
  },
  {
    id: "young-serif",
    label: "Young Serif — robusta, presencia plena",
    cssFamily: '"Young Serif", Georgia, serif',
    googleHref: "https://fonts.googleapis.com/css2?family=Young+Serif&display=swap",
  },
  {
    id: "instrument-serif",
    label: "Instrument Serif — elegante con itálica fluida",
    cssFamily: '"Instrument Serif", Georgia, serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap",
  },
  {
    id: "inter",
    label: "Inter — minimalista (sin serifas)",
    cssFamily: '"Inter", system-ui, sans-serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400..600&display=swap",
  },
];

/** Familias para body / UI. */
export const BODY_FONTS: {
  id: BrandingBodyFont;
  label: string;
  cssFamily: string;
  googleHref: string | null;
}[] = [
  {
    id: "inter-tight",
    label: "Inter Tight — neutral, óptima para UI",
    cssFamily: '"Inter Tight", "Inter", system-ui, sans-serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400..700&display=swap",
  },
  {
    id: "inter",
    label: "Inter — el estándar moderno",
    cssFamily: '"Inter", system-ui, sans-serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400..600&display=swap",
  },
  {
    id: "manrope",
    label: "Manrope — geométrica y amable",
    cssFamily: '"Manrope", system-ui, sans-serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Manrope:wght@400..600&display=swap",
  },
  {
    id: "dm-sans",
    label: "DM Sans — funcional y compacta",
    cssFamily: '"DM Sans", system-ui, sans-serif',
    googleHref: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400..600&display=swap",
  },
  {
    id: "poppins",
    label: "Poppins — redonda y popular",
    cssFamily: '"Poppins", system-ui, sans-serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap",
  },
  {
    id: "work-sans",
    label: "Work Sans — humana y trabajadora",
    cssFamily: '"Work Sans", system-ui, sans-serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400..600&display=swap",
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk — técnica y futurista",
    cssFamily: '"Space Grotesk", system-ui, sans-serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400..600&display=swap",
  },
  {
    id: "plus-jakarta-sans",
    label: "Plus Jakarta Sans — moderna y fresca",
    cssFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400..600&display=swap",
  },
  {
    id: "outfit",
    label: "Outfit — limpia y digital-first",
    cssFamily: '"Outfit", system-ui, sans-serif',
    googleHref: "https://fonts.googleapis.com/css2?family=Outfit:wght@400..600&display=swap",
  },
  {
    id: "lexend",
    label: "Lexend — alta legibilidad",
    cssFamily: '"Lexend", system-ui, sans-serif',
    googleHref: "https://fonts.googleapis.com/css2?family=Lexend:wght@400..600&display=swap",
  },
  {
    id: "nunito-sans",
    label: "Nunito Sans — redondeada y amable",
    cssFamily: '"Nunito Sans", system-ui, sans-serif',
    googleHref:
      "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400..600&display=swap",
  },
];

export const DENSITY_LABELS: Record<BrandingDensity, string> = {
  compact: "Compacto — más densidad en pantalla",
  comfortable: "Cómodo — equilibrio recomendado",
  spacious: "Amplio — generoso, ideal para tablets grandes",
};

export const CORNER_STYLE_LABELS: Record<BrandingCornerStyle, string> = {
  soft: "Suave — esquinas redondeadas (12px)",
  rounded: "Pronunciada — esquinas marcadas (20px)",
  squared: "Recta — esquinas mínimas (4px)",
};

export const CORNER_RADIUS_PX: Record<BrandingCornerStyle, { base: number; large: number }> = {
  soft: { base: 12, large: 20 },
  rounded: { base: 18, large: 28 },
  squared: { base: 4, large: 8 },
};

export const DENSITY_SCALE: Record<BrandingDensity, number> = {
  compact: 0.92,
  comfortable: 1,
  spacious: 1.08,
};

/** Aplica un preset sobre una paleta dada (no muta el original). */
export function applyAccentPreset(
  palette: BrandingPalette,
  preset: PresetOverrides,
): BrandingPalette {
  return { ...palette, ...preset };
}

/** Encuentra preset por id. */
export const findPreset = (id: string) => PALETTE_PRESETS.find((p) => p.id === id);

/** Convierte una `BrandingPalette` al mapa de variables CSS `--lumia-*`. */
export function paletteToCssVars(p: BrandingPalette): Record<string, string> {
  return {
    "--lumia-bg": p.bg,
    "--lumia-surface": p.surface,
    "--lumia-elevated": p.elevated,
    "--lumia-ink": p.ink,
    "--lumia-ink-soft": p.inkSoft,
    "--lumia-ink-muted": p.inkMuted,
    "--lumia-border": p.border,
    "--lumia-divider": p.divider,
    "--lumia-accent": p.accent,
    "--lumia-accent-deep": p.accentDeep,
    "--lumia-accent-soft": p.accentSoft,
    "--lumia-success": p.success,
    "--lumia-warning": p.warning,
    "--lumia-danger": p.danger,
    "--lumia-info": p.info,
  };
}

/** Construye un branding por defecto para un tenant nuevo. */
export function defaultRichBranding(displayName: string): RichBranding {
  return {
    displayName,
    palette: DEFAULT_PALETTE_LIGHT,
    paletteDark: DEFAULT_PALETTE_DARK,
    typography: { heading: "cormorant", body: "inter-tight" },
    layout: { density: "comfortable", cornerStyle: "soft" },
    presetId: "emerald",
  };
}

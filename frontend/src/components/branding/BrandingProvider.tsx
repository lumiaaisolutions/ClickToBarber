"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import {
  BODY_FONTS,
  CORNER_RADIUS_PX,
  DENSITY_SCALE,
  HEADING_FONTS,
  paletteToCssVars,
  type RichBranding,
} from "@/lib/branding-presets";
import { useBrandingPreview } from "@/store/branding-preview-store";

/**
 * Tokens persistidos por el backend (shape FLAT). Sigue siendo el contrato
 * público que consumen los Server Components — el Provider lo recibe igual.
 */
export interface TenantBranding {
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
  extra?: Record<string, unknown> | null;
}

/**
 * BrandingProvider — aplica el branding del tenant scoped al subtree.
 *
 * - Aplica `--lumia-*` CSS vars en el wrapper (paleta light/dark + radio + densidad).
 * - Inyecta dinámicamente <link rel="stylesheet"> de Google Fonts del par tipográfico.
 * - Si hay un draft activo en `useBrandingPreview` (editor abierto), pinta ese.
 *
 * El subtree-scoping evita race conditions entre tenants en SSR/edge cache:
 * NUNCA tocamos :root global, sólo el wrapper `data-tenant-branding`.
 */

import { flatToRich } from "@/lib/branding-adapter";

const BrandingContext = createContext<TenantBranding | null>(null);

export function BrandingProvider({
  branding,
  children,
}: {
  branding: TenantBranding;
  children: ReactNode;
}) {
  const previewRich = useBrandingPreview((s) => s.preview);

  // El branding "vivo" es el preview si existe, de lo contrario el persistido.
  const richBranding: RichBranding = useMemo(() => {
    if (previewRich) return previewRich;
    return flatToRich(branding);
  }, [previewRich, branding]);

  const styleVars = useMemo<React.CSSProperties>(() => {
    const palette =
      branding.mode === "dark" ? richBranding.paletteDark : richBranding.palette;
    const cssVars = paletteToCssVars(palette);
    const radius = CORNER_RADIUS_PX[richBranding.layout.cornerStyle];
    const density = DENSITY_SCALE[richBranding.layout.density];
    const heading = HEADING_FONTS.find((f) => f.id === richBranding.typography.heading);
    const body = BODY_FONTS.find((f) => f.id === richBranding.typography.body);

    return {
      ...(cssVars as React.CSSProperties),
      // Radio + densidad
      ["--lumia-radius" as string]: `${radius.base}px`,
      ["--lumia-radius-lg" as string]: `${radius.large}px`,
      ["--lumia-density-scale" as string]: density.toString(),
      // Familias resueltas
      ["--lumia-font-display" as string]: heading?.cssFamily ?? "var(--font-display)",
      ["--lumia-font-body" as string]: body?.cssFamily ?? "var(--font-sans)",
      // Compatibilidad con tokens previos del subtree
      ["--tenant-primary" as string]: palette.accentDeep,
      ["--tenant-accent" as string]: palette.accent,
      ["--primary" as string]: palette.accentDeep,
      ["--accent" as string]: palette.accent,
      ["--tenant-radius" as string]: `${radius.base}px`,
      ["--tenant-density" as string]: density.toString(),
    };
  }, [richBranding, branding.mode]);

  // Inyecta los <link rel="stylesheet"> de Google Fonts del par tipográfico
  // y limpia los obsoletos. Marcamos cada link con data-lumia-brand-font="1"
  // para distinguirlos de los <link> que pone next/font.
  useEffect(() => {
    if (typeof document === "undefined") return;

    const heading = HEADING_FONTS.find((f) => f.id === richBranding.typography.heading);
    const body = BODY_FONTS.find((f) => f.id === richBranding.typography.body);
    const desiredHrefs = [heading?.googleHref, body?.googleHref].filter(
      (h): h is string => Boolean(h),
    );

    const existing = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[data-lumia-brand-font="1"]'),
    );
    for (const el of existing) {
      if (!desiredHrefs.includes(el.href)) el.remove();
    }
    for (const href of desiredHrefs) {
      if (!document.querySelector(`link[data-lumia-brand-font="1"][href="${href}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.dataset.lumiaBrandFont = "1";
        document.head.appendChild(link);
      }
    }
  }, [richBranding.typography.heading, richBranding.typography.body]);

  return (
    <BrandingContext.Provider value={branding}>
      <div
        data-tenant-branding=""
        data-tenant-mode={branding.mode}
        data-tenant-preset={richBranding.presetId}
        style={styleVars}
        className="tenant-scope"
      >
        {children}
      </div>
    </BrandingContext.Provider>
  );
}

export function useBranding(): TenantBranding {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error("useBranding debe usarse dentro de <BrandingProvider>");
  }
  return ctx;
}

/** Acceso seguro (sin throw) — útil en componentes compartidos. */
export function useOptionalBranding(): TenantBranding | null {
  return useContext(BrandingContext);
}

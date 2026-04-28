"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * Tokens de identidad por tenant. Espejo de TenantBranding del backend.
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
}

const RADIUS_MAP: Record<TenantBranding["radius"], string> = {
  sharp: "4px",
  soft: "14px",
  round: "24px",
};

const DENSITY_MAP: Record<TenantBranding["density"], string> = {
  compact: "0.85",
  comfortable: "1",
  airy: "1.18",
};

const BrandingContext = createContext<TenantBranding | null>(null);

/**
 * BrandingProvider — inyecta CSS variables scoped al subtree.
 *
 * Estrategia: en lugar de tocar :root global (que contaminaría sesiones
 * paralelas de tenants distintos en el mismo servidor SSR), aplicamos
 * style="--tenant-primary: ..." al wrapper. CSS variables son heredadas
 * por todos los descendientes pero NO afectan otros subtrees.
 *
 * Esto es seguro:
 *   - Múltiples /admin/{slug} en diferentes pestañas: cada una hidrata
 *     con su propio branding.
 *   - El SSR genera HTML por request (no comparte memoria) y next/font
 *     ya soporta las fuentes oficiales que listamos.
 */
export function BrandingProvider({
  branding,
  children,
}: {
  branding: TenantBranding;
  children: ReactNode;
}) {
  const styleVars = useMemo<React.CSSProperties>(() => {
    return {
      // Sobrescribe las variables base del subtree
      ["--tenant-primary" as string]: branding.primary_color,
      ["--tenant-accent" as string]: branding.accent_color,
      ["--primary" as string]: branding.primary_color,
      ["--accent" as string]: branding.accent_color,
      ["--tenant-radius" as string]: RADIUS_MAP[branding.radius],
      ["--tenant-density" as string]: DENSITY_MAP[branding.density],
    };
  }, [branding]);

  return (
    <BrandingContext.Provider value={branding}>
      <div
        data-tenant-branding=""
        data-tenant-mode={branding.mode}
        data-tenant-preset={branding.preset}
        style={styleVars}
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

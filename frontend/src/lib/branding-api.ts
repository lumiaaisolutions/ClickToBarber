/**
 * Helpers para cargar TenantBranding desde el backend.
 * Usar SIEMPRE en server components (Server-Side Rendering) para que el
 * HTML se entregue ya con los tokens correctos del tenant.
 */
import { api } from "@/lib/api";
import type { TenantBranding } from "@/components/branding/BrandingProvider";

interface BrandingResponse {
  data: TenantBranding;
}

/** Branding público del tenant — para /b/{slug}. */
export async function fetchPublicBranding(slug: string): Promise<TenantBranding | null> {
  try {
    const json = await api<BrandingResponse>(`/tenant/${slug}/branding`);
    return json.data;
  } catch {
    return null;
  }
}

/** Branding del tenant del admin autenticado — para /admin/{slug}. */
export async function fetchAdminBranding(): Promise<TenantBranding | null> {
  try {
    const json = await api<BrandingResponse>("/admin/branding", { authed: true });
    return json.data;
  } catch {
    return null;
  }
}

/** Default LUMIA si el backend no responde. */
export const FALLBACK_BRANDING: TenantBranding = {
  preset: "old-money-emerald",
  primary_color: "#1F3D2B",
  accent_color: "#B8935E",
  font_display: "Cormorant Garamond",
  font_body: "Inter Tight",
  radius: "soft",
  density: "comfortable",
  mode: "light",
  logo_url: null,
  cover_url: null,
  public_tagline: null,
  admin_display_name: null,
};

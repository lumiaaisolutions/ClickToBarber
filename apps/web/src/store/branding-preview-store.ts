"use client";

import { create } from "zustand";
import type { RichBranding } from "@/lib/branding-presets";

/**
 * Override efímero de branding para vista previa en vivo.
 *
 * Mientras el admin edita en `/admin/identity` o en el wizard de onboarding,
 * el draft se guarda aquí. El `BrandingProvider` lo usa con prioridad sobre
 * el branding persistido del tenant. Al guardar o cancelar se limpia.
 *
 * No se persiste — al recargar la página, el preview se descarta.
 */
interface BrandingPreviewState {
  preview: RichBranding | null;
  setPreview: (b: RichBranding | null) => void;
  clearPreview: () => void;
}

export const useBrandingPreview = create<BrandingPreviewState>((set) => ({
  preview: null,
  setPreview: (b) => set({ preview: b }),
  clearPreview: () => set({ preview: null }),
}));

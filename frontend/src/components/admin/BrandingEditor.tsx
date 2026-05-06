"use client";

/**
 * Editor de identidad visual — adaptado de Lumina (Restaurante).
 *
 * 4 paneles independientes (Identity / Palette / Typography / Layout) que
 * pueden montarse juntos (`step="all"`) o uno por uno desde el wizard de
 * onboarding. Toda edición se publica al `branding-preview-store` para que
 * el resto de la página repinte en vivo.
 */
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BODY_FONTS,
  CORNER_STYLE_LABELS,
  DEFAULT_PALETTE_DARK,
  DEFAULT_PALETTE_LIGHT,
  DENSITY_LABELS,
  HEADING_FONTS,
  PALETTE_PRESETS,
  type BrandingBodyFont,
  type BrandingCornerStyle,
  type BrandingDensity,
  type BrandingHeadingFont,
  type RichBranding,
} from "@/lib/branding-presets";
import { flatToRich, richToFlat } from "@/lib/branding-adapter";
import type { TenantBranding } from "@/components/branding/BrandingProvider";
import { useBrandingPreview } from "@/store/branding-preview-store";

export type BrandingEditorStep =
  | "identity"
  | "palette"
  | "typography"
  | "layout"
  | "all";

export const STEP_TITLES: Record<Exclude<BrandingEditorStep, "all">, string> = {
  identity: "Identidad",
  palette: "Paleta",
  typography: "Tipografía",
  layout: "Layout",
};

export const STEP_DESCRIPTIONS: Record<Exclude<BrandingEditorStep, "all">, string> = {
  identity:
    "El nombre y el logo que verán tus clientes y tu personal en cada pantalla.",
  palette:
    "Empieza con una paleta sugerida o personaliza los acentos a tu marca.",
  typography: "Elige el par tipográfico que mejor representa tu barbería.",
  layout: "Densidad y carácter visual del UI.",
};

/**
 * Editor controlado puro — recibe valor y emite onChange.
 * Útil dentro del wizard donde el contenedor maneja la persistencia.
 */
export function BrandingEditorPanels({
  value,
  onChange,
  step = "all",
}: {
  value: RichBranding;
  onChange: (next: RichBranding) => void;
  step?: BrandingEditorStep;
}) {
  const showIdentity = step === "identity" || step === "all";
  const showPalette = step === "palette" || step === "all";
  const showTypography = step === "typography" || step === "all";
  const showLayout = step === "layout" || step === "all";

  return (
    <div className="space-y-7">
      {showIdentity && <IdentityPanel value={value} onChange={onChange} />}
      {showPalette && <PalettePanel value={value} onChange={onChange} />}
      {showTypography && <TypographyPanel value={value} onChange={onChange} />}
      {showLayout && <LayoutPanel value={value} onChange={onChange} />}
    </div>
  );
}

/**
 * BrandingEditor — wrapper "page-level" que carga el branding desde el API,
 * lo edita en el panel completo y lo persiste con el botón Guardar.
 *
 * Mantiene la firma original (initial / tenantName / canWrite) para no
 * romper /admin/identity/page.tsx, pero internamente usa el modelo rico.
 */
export function BrandingEditor({
  initial,
  tenantName,
  canWrite,
}: {
  initial: TenantBranding;
  tenantName: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setPreview = useBrandingPreview((s) => s.setPreview);
  const clearPreview = useBrandingPreview((s) => s.clearPreview);

  const [draft, setDraft] = useState<RichBranding>(() =>
    flatToRich({ ...initial, admin_display_name: initial.admin_display_name ?? tenantName }),
  );

  // Live preview: cualquier edición se refleja inmediatamente en el resto
  // del subtree del BrandingProvider.
  useEffect(() => {
    setPreview(draft);
  }, [draft, setPreview]);

  // Al desmontar, limpiar el preview para que vuelva al persistido.
  useEffect(() => {
    return () => clearPreview();
  }, [clearPreview]);

  function discard() {
    const fresh = flatToRich({ ...initial, admin_display_name: initial.admin_display_name ?? tenantName });
    setDraft(fresh);
    setSaved(false);
    setError(null);
  }

  function save() {
    if (!canWrite) return;
    setError(null);
    const flat = richToFlat(draft, initial);
    startTransition(async () => {
      const res = await fetch("/api/admin/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flat),
        cache: "no-store",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(json?.message ?? "Error guardando.");
        return;
      }
      setSaved(true);
      // Tras guardar, mantenemos el preview activo sólo hasta el siguiente
      // refresh; el server-component recargará el branding persistido.
      router.refresh();
    });
  }

  return (
    <div className="grid lg:grid-cols-[1.3fr_1fr] gap-8">
      <div className="space-y-8">
        {!canWrite && (
          <div className="rounded-[12px] border border-line-medium bg-bg-vellum/40 p-4 text-sm text-ink-2 inline-flex items-center gap-2.5">
            <Lock size={14} className="text-accent-3" />
            Tu rol no permite editar la identidad. Pídele al administrador.
          </div>
        )}

        <BrandingEditorPanels value={draft} onChange={canWrite ? setDraft : () => {}} />

        {error && (
          <div className="p-3 rounded-[10px] bg-danger/8 border border-danger/30 text-danger text-sm">
            {error}
          </div>
        )}

        {canWrite && (
          <div className="flex items-center gap-3 pt-4 border-t border-line-fine">
            <button type="button" onClick={save} disabled={pending} className="btn btn-primary disabled:opacity-50">
              {pending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
              Guardar identidad
            </button>
            <button type="button" onClick={discard} className="btn btn-ghost text-sm">
              <RefreshCw size={14} /> Descartar cambios
            </button>
            {saved && <span className="text-xs text-success ml-2 italic">Guardado.</span>}
          </div>
        )}
      </div>

      <div className="sticky top-8 self-start">
        <BrandingPreviewCard branding={draft} />
      </div>
    </div>
  );
}

// ─────────────────────────── Identity ───────────────────────────
function IdentityPanel({
  value,
  onChange,
}: {
  value: RichBranding;
  onChange: (next: RichBranding) => void;
}) {
  return (
    <Section eyebrow="Paso 1" title="Identidad">
      <p className="text-xs text-ink-2 -mt-2">{STEP_DESCRIPTIONS.identity}</p>
      <div className="grid md:grid-cols-2 gap-5 mt-4">
        <div className="space-y-3">
          <Field label="Nombre comercial">
            <input
              type="text"
              value={value.displayName ?? ""}
              onChange={(e) => onChange({ ...value, displayName: e.target.value })}
              placeholder="Ej. Barbería El Navajazo"
              maxLength={48}
              className="w-full h-11 rounded-[12px] border border-line-medium bg-bg-canvas px-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </Field>

          <Field label="Tagline (opcional)">
            <input
              type="text"
              value={value.tagline ?? ""}
              onChange={(e) => onChange({ ...value, tagline: e.target.value || undefined })}
              placeholder="Ej. Barbería de autor desde 2014"
              maxLength={80}
              className="w-full h-11 rounded-[12px] border border-line-medium bg-bg-canvas px-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </Field>
        </div>

        <div className="space-y-3">
          <Field label="URL del logo (PNG/SVG)">
            <input
              type="url"
              value={value.logoUrl ?? ""}
              onChange={(e) => onChange({ ...value, logoUrl: e.target.value || undefined })}
              placeholder="https://..."
              className="w-full h-11 rounded-[12px] border border-line-medium bg-bg-canvas px-3 text-sm font-mono focus:outline-none focus:border-primary transition"
            />
          </Field>
          <p className="text-[11px] text-ink-muted leading-relaxed">
            Si aún no tienes logo, déjalo vacío — usaremos el wordmark de tu negocio.
          </p>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────── Palette ───────────────────────────
function PalettePanel({
  value,
  onChange,
}: {
  value: RichBranding;
  onChange: (next: RichBranding) => void;
}) {
  const matchedPreset = PALETTE_PRESETS.find((p) => p.id === value.presetId);

  function pickPreset(id: string) {
    const preset = PALETTE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    onChange({
      ...value,
      presetId: id,
      palette: { ...DEFAULT_PALETTE_LIGHT, ...preset.light },
      paletteDark: { ...DEFAULT_PALETTE_DARK, ...preset.dark },
    });
  }

  return (
    <Section eyebrow="Paso 2" title="Paleta">
      <p className="text-xs text-ink-2 -mt-2">{STEP_DESCRIPTIONS.palette}</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        {PALETTE_PRESETS.map((p) => {
          const active = matchedPreset?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pickPreset(p.id)}
              className={cn(
                "text-left rounded-[14px] border p-4 transition",
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-line-medium hover:border-primary/40 bg-bg-canvas",
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-5 h-5 rounded-full border border-line-fine"
                  style={{ backgroundColor: p.light.accent ?? "transparent" }}
                />
                <span
                  className="w-5 h-5 rounded-full border border-line-fine"
                  style={{ backgroundColor: p.light.accentDeep ?? "transparent" }}
                />
                <span
                  className="w-5 h-5 rounded-full border border-line-fine"
                  style={{ backgroundColor: p.light.accentSoft ?? "transparent" }}
                />
                {active && <Check size={14} className="ml-auto text-primary" strokeWidth={1.8} />}
              </div>
              <div className="font-display italic text-base text-ink leading-tight">{p.name}</div>
              <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">{p.description}</p>
            </button>
          );
        })}
      </div>

      <details className="rounded-[14px] border border-line-medium bg-bg-vellum/40 p-4 space-y-4 mt-5">
        <summary className="cursor-pointer text-sm font-medium text-ink select-none">
          Personalizar colores manualmente (avanzado)
        </summary>

        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-2">
            Acentos · light + dark sincronizados
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ColorPicker
              label="Acento principal"
              value={value.palette.accent}
              onChange={(v) =>
                onChange({
                  ...value,
                  palette: { ...value.palette, accent: v },
                  paletteDark: { ...value.paletteDark, accent: v },
                })
              }
            />
            <ColorPicker
              label="Acento intenso"
              value={value.palette.accentDeep}
              onChange={(v) =>
                onChange({
                  ...value,
                  palette: { ...value.palette, accentDeep: v },
                  paletteDark: { ...value.paletteDark, accentDeep: v },
                })
              }
            />
            <ColorPicker
              label="Acento suave"
              value={value.palette.accentSoft}
              onChange={(v) =>
                onChange({
                  ...value,
                  palette: { ...value.palette, accentSoft: v },
                  paletteDark: { ...value.paletteDark, accentSoft: v },
                })
              }
            />
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-2">
            Superficies · solo tema claro
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorPicker
              label="Fondo (bg)"
              value={value.palette.bg}
              onChange={(v) => onChange({ ...value, palette: { ...value.palette, bg: v } })}
            />
            <ColorPicker
              label="Tarjetas (surface)"
              value={value.palette.surface}
              onChange={(v) => onChange({ ...value, palette: { ...value.palette, surface: v } })}
            />
            <ColorPicker
              label="Elevado / hover"
              value={value.palette.elevated}
              onChange={(v) => onChange({ ...value, palette: { ...value.palette, elevated: v } })}
            />
            <ColorPicker
              label="Borde"
              value={value.palette.border}
              onChange={(v) =>
                onChange({
                  ...value,
                  palette: { ...value.palette, border: v, divider: v },
                })
              }
            />
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-2">
            Tinta · solo tema claro
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ColorPicker
              label="Tinta principal"
              value={value.palette.ink}
              onChange={(v) => onChange({ ...value, palette: { ...value.palette, ink: v } })}
            />
            <ColorPicker
              label="Tinta secundaria"
              value={value.palette.inkSoft}
              onChange={(v) => onChange({ ...value, palette: { ...value.palette, inkSoft: v } })}
            />
            <ColorPicker
              label="Tinta sutil"
              value={value.palette.inkMuted}
              onChange={(v) => onChange({ ...value, palette: { ...value.palette, inkMuted: v } })}
            />
          </div>
        </div>

        <p className="text-[11px] text-ink-muted leading-relaxed">
          Los acentos se sincronizan entre tema claro y oscuro. Las superficies y tintas afectan
          sólo el tema claro — el oscuro conserva la paleta por defecto para no romper la
          legibilidad.
        </p>
      </details>
    </Section>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative rounded-[12px] border border-line-medium overflow-hidden bg-bg-canvas">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={label}
        />
        <div className="h-12 w-full pointer-events-none" style={{ backgroundColor: value }} />
        <div className="px-3 py-2 border-t border-line-fine flex items-center">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent font-mono text-xs focus:outline-none"
            spellCheck={false}
            maxLength={9}
          />
        </div>
      </div>
    </label>
  );
}

// ─────────────────────────── Typography ───────────────────────────
function useAllFontsPreloaded() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const allHrefs = [...HEADING_FONTS, ...BODY_FONTS]
      .map((f) => f.googleHref)
      .filter((h): h is string => Boolean(h));
    const unique = Array.from(new Set(allHrefs));
    for (const href of unique) {
      if (document.querySelector(`link[href="${href}"]`)) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.lumiaFontPreview = "1";
      document.head.appendChild(link);
    }
  }, []);
}

function TypographyPanel({
  value,
  onChange,
}: {
  value: RichBranding;
  onChange: (next: RichBranding) => void;
}) {
  useAllFontsPreloaded();
  return (
    <Section eyebrow="Paso 3" title="Tipografía">
      <p className="text-xs text-ink-2 -mt-2">{STEP_DESCRIPTIONS.typography}</p>
      <div className="grid md:grid-cols-2 gap-5 mt-4">
        <div>
          <FieldLabel>Encabezados (display)</FieldLabel>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {HEADING_FONTS.map((f) => (
              <FontOption
                key={f.id}
                label={f.label}
                cssFamily={f.cssFamily}
                sample="El Navajazo"
                active={value.typography.heading === f.id}
                onClick={() =>
                  onChange({
                    ...value,
                    typography: {
                      ...value.typography,
                      heading: f.id as BrandingHeadingFont,
                    },
                  })
                }
              />
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Texto / UI</FieldLabel>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {BODY_FONTS.map((f) => (
              <FontOption
                key={f.id}
                label={f.label}
                cssFamily={f.cssFamily}
                sample="Reservar tu próximo corte"
                active={value.typography.body === f.id}
                onClick={() =>
                  onChange({
                    ...value,
                    typography: {
                      ...value.typography,
                      body: f.id as BrandingBodyFont,
                    },
                  })
                }
              />
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function FontOption({
  label,
  cssFamily,
  sample,
  active,
  onClick,
}: {
  label: string;
  cssFamily: string;
  sample: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-[12px] border p-3 transition",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-line-medium hover:border-primary/40 bg-bg-canvas",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ink-muted">{label}</span>
        {active && <Check size={13} className="text-primary" strokeWidth={1.8} />}
      </div>
      <div className="mt-1 text-xl text-ink leading-tight" style={{ fontFamily: cssFamily }}>
        {sample}
      </div>
    </button>
  );
}

// ─────────────────────────── Layout ───────────────────────────
function LayoutPanel({
  value,
  onChange,
}: {
  value: RichBranding;
  onChange: (next: RichBranding) => void;
}) {
  return (
    <Section eyebrow="Paso 4" title="Layout">
      <p className="text-xs text-ink-2 -mt-2">{STEP_DESCRIPTIONS.layout}</p>
      <div className="grid md:grid-cols-2 gap-5 mt-4">
        <div>
          <FieldLabel>Densidad</FieldLabel>
          <div className="space-y-2">
            {(["compact", "comfortable", "spacious"] as const).map((d) => {
              const active = value.layout.density === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    onChange({ ...value, layout: { ...value.layout, density: d as BrandingDensity } })
                  }
                  className={cn(
                    "w-full text-left rounded-[12px] border px-3 py-3 transition",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-line-medium hover:border-primary/40 bg-bg-canvas",
                  )}
                >
                  <div className="text-sm text-ink">{DENSITY_LABELS[d]}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <FieldLabel>Esquinas</FieldLabel>
          <div className="space-y-2">
            {(["soft", "rounded", "squared"] as const).map((c) => {
              const active = value.layout.cornerStyle === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      layout: { ...value.layout, cornerStyle: c as BrandingCornerStyle },
                    })
                  }
                  className={cn(
                    "w-full text-left rounded-[12px] border px-3 py-3 transition",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-line-medium hover:border-primary/40 bg-bg-canvas",
                  )}
                >
                  <div className="text-sm text-ink">{CORNER_STYLE_LABELS[c]}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────── Preview Card ───────────────────────────
export function BrandingPreviewCard({ branding }: { branding: RichBranding }) {
  const palette = branding.palette;
  const headingFamily = HEADING_FONTS.find((f) => f.id === branding.typography.heading)?.cssFamily;
  const bodyFamily = BODY_FONTS.find((f) => f.id === branding.typography.body)?.cssFamily;

  return (
    <div
      className="rounded-[18px] border p-6 space-y-5"
      style={{
        background: palette.surface,
        borderColor: palette.border,
        color: palette.ink,
        fontFamily: bodyFamily,
      }}
    >
      <div className="text-[10px] tracking-[0.22em] uppercase" style={{ color: palette.accentDeep }}>
        Preview en vivo
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        {branding.logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={branding.logoUrl}
            alt={branding.displayName ?? "logo"}
            className="h-10 w-10 object-contain rounded"
          />
        ) : (
          <span
            className="h-10 w-10 rounded-full"
            style={{ background: palette.accent }}
          />
        )}
        <div className="min-w-0">
          <div
            className="text-2xl italic leading-tight truncate"
            style={{ fontFamily: headingFamily, color: palette.ink }}
          >
            {branding.displayName || "Tu barbería"}
          </div>
          {branding.tagline && (
            <div
              className="text-xs mt-0.5 truncate italic"
              style={{ color: palette.inkSoft, fontFamily: headingFamily }}
            >
              {branding.tagline}
            </div>
          )}
        </div>
      </div>

      {/* Card de servicio */}
      <div
        className="rounded-[14px] p-4 border"
        style={{ background: palette.bg, borderColor: palette.border }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg italic leading-tight" style={{ fontFamily: headingFamily }}>
              Corte clásico + barba
            </div>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: palette.inkSoft }}>
              45 minutos · Incluye lavado caliente y aplicación de aceite premium.
            </p>
          </div>
          <span
            className="text-[10px] uppercase tracking-[0.18em] px-2 h-5 inline-flex items-center rounded-full shrink-0"
            style={{ background: palette.accentSoft, color: palette.accentDeep }}
          >
            Top
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-lg italic" style={{ fontFamily: headingFamily }}>
            $ 320
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center h-9 px-4 rounded-[10px] text-xs font-medium"
            style={{ background: palette.ink, color: palette.bg, fontFamily: bodyFamily }}
          >
            Reservar
          </button>
        </div>
      </div>

      {/* Estados semánticos */}
      <div className="flex flex-wrap gap-2">
        <span
          className="inline-flex items-center h-7 px-3 rounded-full text-[10px] uppercase tracking-[0.15em]"
          style={{ background: `${palette.success}28`, color: palette.success }}
        >
          Confirmada
        </span>
        <span
          className="inline-flex items-center h-7 px-3 rounded-full text-[10px] uppercase tracking-[0.15em]"
          style={{ background: `${palette.warning}28`, color: palette.warning }}
        >
          En curso
        </span>
        <span
          className="inline-flex items-center h-7 px-3 rounded-full text-[10px] uppercase tracking-[0.15em]"
          style={{ background: `${palette.info}28`, color: palette.info }}
        >
          Agendada
        </span>
      </div>

      {/* Acentos como swatches */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: palette.inkMuted }}>
          Acentos aplicados
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[10px] border h-10" style={{ background: palette.accent, borderColor: palette.border }} />
          <div className="rounded-[10px] border h-10" style={{ background: palette.accentDeep, borderColor: palette.border }} />
          <div className="rounded-[10px] border h-10" style={{ background: palette.accentSoft, borderColor: palette.border }} />
        </div>
      </div>

      <div
        className="text-xs leading-relaxed border-t pt-3"
        style={{ color: palette.inkSoft, borderColor: palette.divider }}
      >
        Densidad <strong style={{ color: palette.ink }}>{branding.layout.density}</strong>
        {" · "}
        esquinas <strong style={{ color: palette.ink }}>{branding.layout.cornerStyle}</strong>
      </div>
    </div>
  );
}

// ─────────────────────────── Shared ───────────────────────────
function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-accent-3">{eyebrow}</div>
        <h2 className="font-display italic text-2xl text-ink mt-1">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </label>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1.5">{children}</div>
  );
}

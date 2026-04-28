"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock, RefreshCw } from "lucide-react";
import type { TenantBranding } from "@/components/branding/BrandingProvider";
import { cn } from "@/lib/utils";

const PRESETS = [
  { code: "old-money-emerald", name: "Old Money Verde", primary: "#1F3D2B", accent: "#B8935E", mode: "light" as const },
  { code: "ivory-brass",       name: "Marfil & Latón",   primary: "#4A3320", accent: "#A37438", mode: "sepia" as const },
  { code: "navy-classic",      name: "Navy Clásico",     primary: "#1A2F4F", accent: "#8C9DB5", mode: "light" as const },
  { code: "carbon-premium",    name: "Carbón Premium",   primary: "#2D5240", accent: "#C9A961", mode: "dark"  as const },
];

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
  const [form, setForm] = useState<TenantBranding & { admin_display_name?: string | null }>(initial);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function applyPreset(code: string) {
    const p = PRESETS.find((p) => p.code === code);
    if (!p) return;
    setForm((f) => ({ ...f, preset: p.code, primary_color: p.primary, accent_color: p.accent, mode: p.mode }));
    setSaved(false);
  }

  function save() {
    if (!canWrite) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        cache: "no-store",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(json?.message ?? "Error guardando.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  const previewVars: React.CSSProperties = {
    ["--primary" as string]: form.primary_color,
    ["--accent" as string]: form.accent_color,
  };

  return (
    <div className="grid lg:grid-cols-[1.3fr_1fr] gap-8">
      <div className="space-y-8">
        {!canWrite && (
          <div className="card-paper p-5 text-sm text-ink-2 inline-flex items-center gap-2.5">
            <Lock size={14} className="text-accent-3" />
            Tu rol no permite editar la identidad. Pídele al administrador.
          </div>
        )}

        <Section eyebrow="Paso 1" title="Preset base">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESETS.map((p) => {
              const active = form.preset === p.code;
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => applyPreset(p.code)}
                  disabled={!canWrite}
                  className={cn(
                    "p-4 rounded-[12px] border text-left transition-all duration-300 disabled:opacity-50",
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-line-medium hover:border-primary/50",
                  )}
                >
                  <div className="flex gap-1 mb-3">
                    <span className="w-3 h-3 rounded-full" style={{ background: p.primary }} />
                    <span className="w-3 h-3 rounded-full" style={{ background: p.accent }} />
                  </div>
                  <div className="font-display italic text-base text-ink">{p.name}</div>
                </button>
              );
            })}
          </div>
        </Section>

        <Section eyebrow="Paso 2" title="Colores y bordes">
          <Row>
            <Field label="Primario">
              <div className="flex items-center gap-2">
                <input type="color" value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} disabled={!canWrite} className="h-10 w-16 cursor-pointer rounded-[8px] border border-line-medium bg-transparent disabled:opacity-50" />
                <input type="text" value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} disabled={!canWrite} className="input-boxed font-mono" />
              </div>
            </Field>
            <Field label="Acento">
              <div className="flex items-center gap-2">
                <input type="color" value={form.accent_color} onChange={(e) => update("accent_color", e.target.value)} disabled={!canWrite} className="h-10 w-16 cursor-pointer rounded-[8px] border border-line-medium bg-transparent disabled:opacity-50" />
                <input type="text" value={form.accent_color} onChange={(e) => update("accent_color", e.target.value)} disabled={!canWrite} className="input-boxed font-mono" />
              </div>
            </Field>
          </Row>
          <Row>
            <Field label="Bordes">
              <Segmented disabled={!canWrite} value={form.radius} onChange={(v) => update("radius", v as TenantBranding["radius"])} options={[{value:"sharp",label:"Sharp"},{value:"soft",label:"Soft"},{value:"round",label:"Round"}]} />
            </Field>
            <Field label="Densidad">
              <Segmented disabled={!canWrite} value={form.density} onChange={(v) => update("density", v as TenantBranding["density"])} options={[{value:"compact",label:"Comp"},{value:"comfortable",label:"Cóm"},{value:"airy",label:"Aireada"}]} />
            </Field>
            <Field label="Modo">
              <Segmented disabled={!canWrite} value={form.mode} onChange={(v) => update("mode", v as TenantBranding["mode"])} options={[{value:"light",label:"Claro"},{value:"sepia",label:"Sépia"},{value:"dark",label:"Oscuro"}]} />
            </Field>
          </Row>
        </Section>

        <Section eyebrow="Paso 3" title="Tipografía & detalles">
          <Row>
            <Field label="Fuente display">
              <select className="input-boxed" value={form.font_display} onChange={(e) => update("font_display", e.target.value)} disabled={!canWrite}>
                {["Cormorant Garamond","Playfair Display","Tiempos Headline","Italiana"].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Fuente UI">
              <select className="input-boxed" value={form.font_body} onChange={(e) => update("font_body", e.target.value)} disabled={!canWrite}>
                {["Inter Tight","Söhne","Inter","Geist"].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
          </Row>

          <Field label="URL del logo (PNG/SVG)">
            <input type="url" className="input-boxed font-mono" value={form.logo_url ?? ""} onChange={(e) => update("logo_url", e.target.value || null)} disabled={!canWrite} placeholder="https://..." />
          </Field>

          <Field label="Tagline público (aparece en /b/{slug})">
            <input type="text" className="input-boxed" value={form.public_tagline ?? ""} onChange={(e) => update("public_tagline", e.target.value || null)} disabled={!canWrite} placeholder="Barbería de autor desde 2014." />
          </Field>
        </Section>

        {error && <div className="p-3 rounded-[10px] bg-danger/8 border border-danger/30 text-danger text-sm">{error}</div>}

        {canWrite && (
          <div className="flex items-center gap-3 pt-4">
            <button type="button" onClick={save} disabled={pending} className="btn btn-primary disabled:opacity-50">
              {pending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
              Guardar identidad
            </button>
            <button type="button" onClick={() => { setForm(initial); setSaved(false); }} className="btn btn-ghost text-sm">
              <RefreshCw size={14} /> Descartar
            </button>
            {saved && <span className="text-xs text-success ml-2 italic">Guardado.</span>}
          </div>
        )}
      </div>

      {/* Preview */}
      <div
        className="card-vellum p-7 sticky top-8 self-start"
        style={previewVars}
        data-tenant-mode={form.mode}
      >
        <div className="text-[10px] tracking-imperial text-accent-3 mb-4">Preview en vivo</div>
        <div
          className="rounded-[14px] p-6 border"
          style={{
            background: form.mode === "dark" ? "#0E1014" : form.mode === "sepia" ? "#F4EAD2" : "#FBF7EE",
            color: form.mode === "dark" ? "#F4EFE3" : "#1A1F1B",
            borderColor: form.mode === "dark" ? "rgba(244,239,227,0.14)" : "rgba(26,31,27,0.14)",
            fontFamily: form.font_body,
          }}
        >
          <div className="text-[10px] tracking-imperial mb-3" style={{ color: form.accent_color }}>{form.preset}</div>
          <div className="text-3xl italic mb-1 leading-tight" style={{ fontFamily: form.font_display, color: form.primary_color }}>
            {tenantName || "Tu barbería"}
          </div>
          {form.public_tagline && (
            <div className="text-sm italic mb-5 opacity-75" style={{ fontFamily: form.font_display }}>{form.public_tagline}</div>
          )}
          <div className="flex gap-2 mt-5">
            <span className="inline-flex items-center px-4 py-2 text-xs" style={{ background: form.primary_color, color: "#FBF7EE", borderRadius: form.radius === "sharp" ? 4 : form.radius === "round" ? 24 : 10, fontFamily: form.font_display, letterSpacing: "0.04em" }}>
              Reservar
            </span>
            <span className="inline-flex items-center px-4 py-2 text-xs border" style={{ color: form.primary_color, borderColor: form.primary_color, borderRadius: form.radius === "sharp" ? 4 : form.radius === "round" ? 24 : 10, fontFamily: form.font_display, letterSpacing: "0.04em" }}>
              Ver agenda
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] tracking-imperial text-accent-3">{eyebrow}</div>
        <h2 className="font-display italic text-2xl text-ink mt-1">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-imperial text-ink-muted mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Segmented({ options, value, onChange, disabled }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="flex p-1 rounded-[10px] bg-bg-vellum border border-line-medium">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 px-2 py-1.5 text-xs rounded-[7px] transition-all duration-300 disabled:opacity-50",
            value === o.value ? "bg-primary text-bg-canvas font-medium" : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

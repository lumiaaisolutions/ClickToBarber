"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Palette, Building2, Type, Image as ImageIcon, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

const PRESETS = [
  {
    code: "old-money-emerald",
    name: "Old Money Verde",
    primary: "#1F3D2B",
    accent: "#B8935E",
    mode: "light" as const,
    description: "Verde botella, marfil, oro mate.",
  },
  {
    code: "ivory-brass",
    name: "Marfil & Latón",
    primary: "#4A3320",
    accent: "#A37438",
    mode: "sepia" as const,
    description: "Crema cálida, latón pulido.",
  },
  {
    code: "navy-classic",
    name: "Navy Clásico",
    primary: "#1A2F4F",
    accent: "#8C9DB5",
    mode: "light" as const,
    description: "Azul medianoche, hueso, plata vieja.",
  },
  {
    code: "carbon-premium",
    name: "Carbón Premium",
    primary: "#2D5240",
    accent: "#C9A961",
    mode: "dark" as const,
    description: "Carbón, latón, sangre.",
  },
];

const FONT_DISPLAYS = [
  { value: "Cormorant Garamond", label: "Cormorant" },
  { value: "Playfair Display", label: "Playfair" },
  { value: "Tiempos Headline", label: "Tiempos" },
  { value: "Italiana", label: "Italiana" },
];

const FONT_BODIES = [
  { value: "Inter Tight", label: "Inter Tight" },
  { value: "Söhne", label: "Söhne" },
  { value: "Inter", label: "Inter" },
  { value: "Geist", label: "Geist" },
];

interface FormState {
  tenant_name: string;
  admin_display_name: string;
  preset: string;
  primary_color: string;
  accent_color: string;
  font_display: string;
  font_body: string;
  radius: "sharp" | "soft" | "round";
  density: "compact" | "comfortable" | "airy";
  mode: "light" | "sepia" | "dark";
  logo_url: string;
  public_tagline: string;
}

export function OnboardingWizard({
  initialName,
  initialTenantName,
}: {
  initialName: string;
  initialTenantName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    tenant_name: initialTenantName,
    admin_display_name: initialName,
    preset: PRESETS[0].code,
    primary_color: PRESETS[0].primary,
    accent_color: PRESETS[0].accent,
    font_display: "Cormorant Garamond",
    font_body: "Inter Tight",
    radius: "soft",
    density: "comfortable",
    mode: "light",
    logo_url: "",
    public_tagline: "",
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function pickPreset(code: string) {
    const p = PRESETS.find((p) => p.code === code);
    if (!p) return;
    setForm((f) => ({
      ...f,
      preset: p.code,
      primary_color: p.primary,
      accent_color: p.accent,
      mode: p.mode,
    }));
  }

  function next() {
    setError(null);
    if (step === 0 && (!form.tenant_name.trim() || !form.admin_display_name.trim())) {
      setError("Por favor completa los nombres antes de continuar.");
      return;
    }
    if (step < 3) setStep((s) => (s + 1) as typeof step);
  }
  function prev() { if (step > 0) setStep((s) => (s - 1) as typeof step); }

  async function complete() {
    setError(null);
    startTransition(async () => {
      const payload: Record<string, unknown> = {
        tenant_name: form.tenant_name,
        admin_display_name: form.admin_display_name,
        preset: form.preset,
        primary_color: form.primary_color,
        accent_color: form.accent_color,
        font_display: form.font_display,
        font_body: form.font_body,
        radius: form.radius,
        density: form.density,
        mode: form.mode,
        public_tagline: form.public_tagline || null,
      };
      if (form.logo_url) payload.logo_url = form.logo_url;

      const res = await fetch("/api/admin/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(json?.message ?? "Error guardando tu identidad.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    });
  }

  // Live CSS vars del preview
  const previewVars: React.CSSProperties = {
    ["--primary" as string]: form.primary_color,
    ["--accent" as string]: form.accent_color,
    ["--tenant-radius" as string]: form.radius === "sharp" ? "4px" : form.radius === "round" ? "24px" : "14px",
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-10">
          <div className="text-primary inline-block">
            <Logo size={28} />
          </div>
          <div className="text-[10px] tracking-imperial text-accent-3 mt-6">Bienvenido a LUMIA</div>
          <h1 className="font-display italic text-4xl sm:text-5xl text-ink mt-3">
            Diseñemos tu barbería.
          </h1>
          <p className="text-ink-2 max-w-xl mx-auto mt-3 leading-relaxed">
            Cuatro pasos para dejar tu identidad lista. Podrás cambiar todo desde Identidad cuando quieras.
          </p>
        </div>

        <Stepper current={step} />

        <div className="mt-10 grid lg:grid-cols-[1.2fr_1fr] gap-8">
          <div className="card-paper p-8 sm:p-10">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <Pane key="step0" icon={<Building2 size={20} />} title="Identidad de tu negocio">
                  <Field label="Nombre de la barbería">
                    <input className="input-boxed" value={form.tenant_name} onChange={(e) => update("tenant_name", e.target.value)} placeholder="Barbería Marfil Avenue" />
                  </Field>
                  <Field label="Tu nombre como administrador">
                    <input className="input-boxed" value={form.admin_display_name} onChange={(e) => update("admin_display_name", e.target.value)} placeholder="Sofía Ruiz" />
                  </Field>
                  <Field label="Frase corta para tu landing pública (opcional)">
                    <input className="input-boxed" value={form.public_tagline} onChange={(e) => update("public_tagline", e.target.value)} placeholder="Barbería de autor en CDMX desde 2014." />
                  </Field>
                </Pane>
              )}

              {step === 1 && (
                <Pane key="step1" icon={<Palette size={20} />} title="Elige un preset">
                  <p className="text-sm text-ink-2 mb-6 leading-relaxed">
                    Cuatro paletas curadas. Empieza con una y la ajustas en el siguiente paso.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PRESETS.map((p) => {
                      const active = form.preset === p.code;
                      return (
                        <button
                          key={p.code}
                          onClick={() => pickPreset(p.code)}
                          className={cn(
                            "text-left p-5 rounded-[14px] border transition-all duration-300",
                            active
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-line-medium hover:border-primary/50",
                          )}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-display italic text-xl text-ink">{p.name}</div>
                            <div className="flex gap-1.5">
                              <span className="w-3.5 h-3.5 rounded-full" style={{ background: p.primary }} />
                              <span className="w-3.5 h-3.5 rounded-full" style={{ background: p.accent }} />
                            </div>
                          </div>
                          <div className="text-xs text-ink-2">{p.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </Pane>
              )}

              {step === 2 && (
                <Pane key="step2" icon={<Type size={20} />} title="Ajusta los detalles">
                  <Field label="Color primario">
                    <div className="flex items-center gap-3">
                      <input type="color" value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="h-12 w-20 cursor-pointer rounded-[10px] border border-line-medium bg-transparent" />
                      <input type="text" value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="input-boxed font-mono" />
                    </div>
                  </Field>
                  <Field label="Color acento">
                    <div className="flex items-center gap-3">
                      <input type="color" value={form.accent_color} onChange={(e) => update("accent_color", e.target.value)} className="h-12 w-20 cursor-pointer rounded-[10px] border border-line-medium bg-transparent" />
                      <input type="text" value={form.accent_color} onChange={(e) => update("accent_color", e.target.value)} className="input-boxed font-mono" />
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Fuente display">
                      <select className="input-boxed" value={form.font_display} onChange={(e) => update("font_display", e.target.value)}>
                        {FONT_DISPLAYS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Fuente UI">
                      <select className="input-boxed" value={form.font_body} onChange={(e) => update("font_body", e.target.value)}>
                        {FONT_BODIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Bordes">
                      <SegmentedControl
                        options={[
                          { value: "sharp", label: "Sharp" },
                          { value: "soft", label: "Soft" },
                          { value: "round", label: "Round" },
                        ]}
                        value={form.radius}
                        onChange={(v) => update("radius", v as FormState["radius"])}
                      />
                    </Field>
                    <Field label="Densidad">
                      <SegmentedControl
                        options={[
                          { value: "compact", label: "Comp" },
                          { value: "comfortable", label: "Cóm" },
                          { value: "airy", label: "Aireada" },
                        ]}
                        value={form.density}
                        onChange={(v) => update("density", v as FormState["density"])}
                      />
                    </Field>
                    <Field label="Modo">
                      <SegmentedControl
                        options={[
                          { value: "light", label: "Claro" },
                          { value: "sepia", label: "Sépia" },
                          { value: "dark", label: "Oscuro" },
                        ]}
                        value={form.mode}
                        onChange={(v) => update("mode", v as FormState["mode"])}
                      />
                    </Field>
                  </div>
                </Pane>
              )}

              {step === 3 && (
                <Pane key="step3" icon={<ImageIcon size={20} />} title="Tu logo (opcional)">
                  <p className="text-sm text-ink-2 leading-relaxed mb-6">
                    Si ya tienes un logo en línea, pega la URL. Lo aparecerá en tu /admin y en el link público
                    que comparte con tus clientes. Si no, usaremos el wordmark LUMIA temporalmente y podrás
                    subirlo después.
                  </p>
                  <Field label="URL del logo">
                    <input
                      type="url"
                      className="input-boxed font-mono"
                      value={form.logo_url}
                      onChange={(e) => update("logo_url", e.target.value)}
                      placeholder="https://..."
                    />
                  </Field>

                  <div className="mt-6 p-5 rounded-[14px] bg-bg-vellum/60 border border-line-medium">
                    <div className="text-[10px] tracking-imperial text-accent-3 mb-2">Resumen</div>
                    <div className="space-y-1.5 text-sm">
                      <div><span className="text-ink-muted">Negocio:</span> <span className="text-ink font-display italic">{form.tenant_name}</span></div>
                      <div><span className="text-ink-muted">Admin:</span> <span className="text-ink">{form.admin_display_name}</span></div>
                      <div><span className="text-ink-muted">Preset:</span> <span className="text-ink">{PRESETS.find((p) => p.code === form.preset)?.name}</span></div>
                      <div className="flex items-center gap-3">
                        <span className="text-ink-muted">Paleta:</span>
                        <span className="w-4 h-4 rounded-full" style={{ background: form.primary_color }} />
                        <span className="font-mono text-xs">{form.primary_color}</span>
                        <span className="w-4 h-4 rounded-full" style={{ background: form.accent_color }} />
                        <span className="font-mono text-xs">{form.accent_color}</span>
                      </div>
                    </div>
                  </div>
                </Pane>
              )}
            </AnimatePresence>

            {error && (
              <div className="mt-5 p-3 rounded-[10px] bg-danger/8 border border-danger/30 text-danger text-sm">
                {error}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={prev}
                disabled={step === 0}
                className="btn btn-ghost text-sm disabled:opacity-30"
              >
                <ArrowLeft size={14} /> Atrás
              </button>

              {step < 3 ? (
                <button type="button" onClick={next} className="btn btn-primary text-sm">
                  Siguiente <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={complete}
                  disabled={pending}
                  className="btn btn-primary text-sm disabled:opacity-50"
                >
                  {pending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                  Activar mi LUMIA
                </button>
              )}
            </div>
          </div>

          {/* Preview live */}
          <div
            className="card-vellum p-7 sticky top-8 self-start"
            style={previewVars}
            data-tenant-mode={form.mode}
          >
            <div className="text-[10px] tracking-imperial text-accent-3 mb-4">Preview en vivo</div>
            <div
              className="rounded-[var(--tenant-radius)] p-6 border"
              style={{
                background: form.mode === "dark" ? "#0E1014" : form.mode === "sepia" ? "#F4EAD2" : "#FBF7EE",
                color: form.mode === "dark" ? "#F4EFE3" : "#1A1F1B",
                borderColor: form.mode === "dark" ? "rgba(244,239,227,0.14)" : "rgba(26,31,27,0.14)",
                fontFamily: form.font_body,
              }}
            >
              <div className="text-[10px] tracking-imperial mb-3" style={{ color: form.accent_color }}>
                {form.preset}
              </div>
              <div
                className="text-3xl italic mb-1 leading-tight"
                style={{ fontFamily: form.font_display, color: form.primary_color }}
              >
                {form.tenant_name || "Tu barbería"}
              </div>
              {form.public_tagline && (
                <div className="text-sm italic mb-5 opacity-75" style={{ fontFamily: form.font_display }}>
                  {form.public_tagline}
                </div>
              )}
              <div className="flex gap-2 mt-5">
                <span
                  className="inline-flex items-center px-4 py-2 text-xs"
                  style={{
                    background: form.primary_color,
                    color: "#FBF7EE",
                    borderRadius: form.radius === "sharp" ? 4 : form.radius === "round" ? 24 : 10,
                    fontFamily: form.font_display,
                    letterSpacing: "0.04em",
                  }}
                >
                  Reservar
                </span>
                <span
                  className="inline-flex items-center px-4 py-2 text-xs border"
                  style={{
                    color: form.primary_color,
                    borderColor: form.primary_color,
                    borderRadius: form.radius === "sharp" ? 4 : form.radius === "round" ? 24 : 10,
                    fontFamily: form.font_display,
                    letterSpacing: "0.04em",
                  }}
                >
                  Ver agenda
                </span>
              </div>
              <div className="mt-7 pt-5 border-t border-current/15 text-[10px] flex items-center justify-between" style={{ color: form.primary_color }}>
                <span style={{ fontFamily: form.font_display, fontStyle: "italic" }}>{form.tenant_name?.toLowerCase() || "lumia"}</span>
                <span className="opacity-60 inline-flex items-center gap-1">
                  <Sparkles size={10} /> live preview
                </span>
              </div>
            </div>
            <p className="text-[11px] text-ink-muted mt-4 italic leading-relaxed">
              Se aplicará a tu portal Admin y al link público que compartes con clientes. La landing LUMIA
              y el login conservan la identidad LUMIA original.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pane({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-3 mb-7">
        <div className="p-2 rounded-[10px] bg-primary/8 text-primary border border-primary/16">{icon}</div>
        <h2 className="font-display italic text-2xl text-ink">{title}</h2>
      </div>
      <div className="space-y-5">{children}</div>
    </motion.div>
  );
}

function Stepper({ current }: { current: number }) {
  const labels = ["Negocio", "Preset", "Detalles", "Logo"];
  return (
    <div className="flex items-center justify-center gap-3">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-3">
          <div
            className={cn(
              "shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition-all duration-300",
              i < current && "bg-primary text-bg-canvas",
              i === current && "bg-primary text-bg-canvas ring-4 ring-primary/16",
              i > current && "bg-bg-paper text-ink-muted border border-line-medium",
            )}
          >
            {i < current ? <Check size={12} /> : i + 1}
          </div>
          <div className={cn("text-xs tracking-noble", i <= current ? "text-ink" : "text-ink-muted")}>{l}</div>
          {i < labels.length - 1 && <div className={cn("w-10 h-px", i < current ? "bg-primary" : "bg-line-medium")} />}
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-imperial text-ink-muted mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex p-1 rounded-[10px] bg-bg-vellum border border-line-medium">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 px-2 py-1.5 text-xs rounded-[7px] transition-all duration-300",
            value === o.value ? "bg-primary text-bg-canvas font-medium" : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

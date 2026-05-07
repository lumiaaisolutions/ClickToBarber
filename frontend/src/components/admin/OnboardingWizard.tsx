"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  BrandingEditorPanels,
  BrandingPreviewCard,
  STEP_DESCRIPTIONS,
  STEP_TITLES,
} from "@/components/admin/BrandingEditor";
import { defaultRichBranding, type RichBranding } from "@/lib/branding-presets";
import { richToFlat } from "@/lib/branding-adapter";
import { useBrandingPreview } from "@/store/branding-preview-store";
import { cn } from "@/lib/utils";

type WizardStep = "identity" | "palette" | "typography" | "layout" | "summary";

const STEPS: WizardStep[] = ["identity", "palette", "typography", "layout", "summary"];

export function OnboardingWizard({
  initialName,
  initialTenantName,
}: {
  initialName: string;
  initialTenantName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  // Nombre legal/comercial — se setea sólo en onboarding y queda fijo.
  const [tenantName, setTenantName] = useState(initialTenantName);

  const [draft, setDraft] = useState<RichBranding>(() => ({
    ...defaultRichBranding(initialName || initialTenantName || "Mi barbería"),
  }));

  const setPreview = useBrandingPreview((s) => s.setPreview);
  const clearPreview = useBrandingPreview((s) => s.clearPreview);

  // Live preview: cualquier edición se publica al store.
  useEffect(() => {
    setPreview(draft);
  }, [draft, setPreview]);
  useEffect(() => {
    return () => clearPreview();
  }, [clearPreview]);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const isSummary = step === "summary";

  function next() {
    setError(null);
    if (step === "identity") {
      if (!tenantName.trim()) {
        setError("Necesitamos el nombre de tu barbería para continuar.");
        return;
      }
      if (!draft.displayName?.trim()) {
        setError("Tu nombre como administrador es obligatorio.");
        return;
      }
    }
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    }
  }

  function prev() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  function complete() {
    setError(null);
    const flat = richToFlat(draft);
    const payload: Record<string, unknown> = {
      tenant_name: tenantName,
      admin_display_name: draft.displayName,
      preset: flat.preset,
      primary_color: flat.primary_color,
      accent_color: flat.accent_color,
      font_display: flat.font_display,
      font_body: flat.font_body,
      radius: flat.radius,
      density: flat.density,
      mode: flat.mode,
      public_tagline: flat.public_tagline ?? null,
      extra: flat.extra ?? null,
    };
    if (flat.logo_url) payload.logo_url = flat.logo_url;

    startTransition(async () => {
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
      clearPreview();
      router.replace("/admin");
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-14 texture-paper relative">
      <div className="max-w-5xl mx-auto w-full">
        <header className="flex items-center justify-between mb-6 sm:mb-10 gap-3">
          <div className="text-primary shrink-0">
            <Logo size={26} />
          </div>
          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-accent-3 text-right">
            <Sparkles size={12} strokeWidth={1.5} className="shrink-0" />
            <span className="hidden sm:inline">Personaliza tu sucursal</span>
          </div>
        </header>

        <div className="mb-6 sm:mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent-3 mb-2">
            Paso {stepIndex + 1} de {STEPS.length}
            {!isSummary && ` · ${STEP_TITLES[step]}`}
            {isSummary && " · Resumen"}
          </p>
          <h1 className="font-display italic text-2xl sm:text-3xl md:text-5xl text-ink leading-[1.1]">
            {isSummary
              ? `${draft.displayName || tenantName || "Tu barbería"}, así te verán.`
              : "Diseñemos tu identidad."}
          </h1>
          <p className="text-sm text-ink-2 mt-3 max-w-2xl leading-relaxed">
            {isSummary
              ? "Verifica tu identidad antes de entrar al sistema."
              : STEP_DESCRIPTIONS[step]}
          </p>

          {/* progress dots */}
          <div className="flex items-center gap-1 sm:gap-1.5 mt-5 sm:mt-6">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i < stepIndex
                    ? "bg-accent w-4 sm:w-6"
                    : i === stepIndex
                      ? "bg-ink w-8 sm:w-10"
                      : "bg-line-medium w-4 sm:w-6",
                )}
              />
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_0.85fr] lg:grid-cols-[1.4fr_1fr] gap-6 lg:gap-8 items-start">
          <div className="rounded-[18px] border border-line-medium bg-bg-canvas p-4 sm:p-5 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                {step === "identity" && (
                  <div className="space-y-5">
                    <div>
                      <div className="text-[10px] tracking-[0.22em] uppercase text-accent-3">
                        Paso 1
                      </div>
                      <h2 className="font-display italic text-2xl text-ink mt-1">Identidad</h2>
                      <p className="text-xs text-ink-2 mt-1">{STEP_DESCRIPTIONS.identity}</p>
                    </div>

                    <label className="block">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1.5 block">
                        Nombre legal de tu barbería
                      </span>
                      <input
                        type="text"
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        placeholder="Ej. Barbería El Navajazo S.A."
                        maxLength={64}
                        className="w-full h-11 rounded-[12px] border border-line-medium bg-bg-canvas px-3 text-sm focus:outline-none focus:border-primary transition"
                      />
                      <p className="text-[11px] text-ink-muted mt-1">
                        Sólo se usa en facturación e invitaciones internas. Tus clientes verán el
                        nombre comercial de abajo.
                      </p>
                    </label>

                    <BrandingEditorPanels
                      value={draft}
                      onChange={setDraft}
                      step="identity"
                    />
                  </div>
                )}

                {step !== "identity" && step !== "summary" && (
                  <BrandingEditorPanels value={draft} onChange={setDraft} step={step} />
                )}

                {isSummary && <BrandingPreviewCard branding={draft} />}
              </motion.div>
            </AnimatePresence>

            {error && (
              <div className="mt-5 p-3 rounded-[10px] bg-danger/10 border border-danger/30 text-danger text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 sm:mt-7 pt-5 border-t border-line-fine">
              <button
                type="button"
                onClick={prev}
                disabled={isFirst || pending}
                className="btn btn-ghost text-sm disabled:opacity-30 justify-center"
              >
                <ArrowLeft size={14} strokeWidth={1.6} /> Anterior
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {!isSummary && (
                  <button
                    type="button"
                    onClick={() => setStepIndex(STEPS.length - 1)}
                    className="btn btn-ghost text-sm justify-center"
                  >
                    Saltar al resumen
                  </button>
                )}
                {isLast ? (
                  <button
                    type="button"
                    onClick={complete}
                    disabled={pending}
                    className="btn btn-primary disabled:opacity-50 justify-center"
                  >
                    {pending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} strokeWidth={1.8} />}
                    Aplicar y entrar
                  </button>
                ) : (
                  <button type="button" onClick={next} disabled={pending} className="btn btn-primary disabled:opacity-50 justify-center">
                    Siguiente <ArrowRight size={14} strokeWidth={1.6} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview lateral pegajoso (md+) */}
          <div className="hidden md:block lg:sticky lg:top-8 self-start">
            <BrandingPreviewCard branding={draft} />
          </div>
        </div>

        <p className="text-center text-[11px] text-ink-muted mt-6">
          Podrás volver a personalizar todo desde Administración → Identidad.
        </p>
      </div>
    </main>
  );
}

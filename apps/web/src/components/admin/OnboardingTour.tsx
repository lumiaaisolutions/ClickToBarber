"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Compass } from "lucide-react";

const STORAGE_KEY = "ctb_tour_v2_done";

interface Step {
  target: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    target: "dashboard",
    title: "Cómo va tu día",
    body: "Aquí ves de un vistazo: citas de hoy, lo que se vendió en el mes y clientes que no han vuelto.",
  },
  {
    target: "agenda",
    title: "Tu agenda",
    body: "Arrastra una cita a otra hora para reagendarla. Toca una cita para cambiar barbero o ver más.",
  },
  {
    target: "identity",
    title: "Tu marca",
    body: "Colores, fuentes y logo. Lo que cambies aquí se ve en tu panel y en el enlace que mandas a tus clientes.",
  },
  {
    target: "services",
    title: "Tus servicios",
    body: "Pon qué ofreces, cuánto dura y cuánto cuesta. Es lo primero que ven tus clientes al reservar.",
  },
  {
    target: "pos",
    title: "Productos y cobros",
    body: "Cobra al terminar el corte. Si vendes producto, el inventario baja solo y se guardan las propinas.",
  },
];

export function OnboardingTour({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Auto-open on first login
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (enabled && !window.localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(t);
    }
  }, [enabled]);

  // Allow manual re-open from sidebar "Tour" button
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      setStepIdx(0);
      setOpen(true);
    };
    window.addEventListener("ctb:tour:open", handler);
    return () => window.removeEventListener("ctb:tour:open", handler);
  }, []);

  // Track target element position
  useEffect(() => {
    if (!open) return;
    const target = document.querySelector<HTMLElement>(`[data-tour="${STEPS[stepIdx].target}"]`);
    if (!target) {
      setRect(null);
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const update = () => setRect(target.getBoundingClientRect());
    update();

    const ro = new ResizeObserver(update);
    ro.observe(target);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, stepIdx]);

  function next() {
    if (stepIdx === STEPS.length - 1) finish();
    else setStepIdx((i) => i + 1);
  }

  function finish() {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    setStepIdx(0);
  }

  if (!open) return null;

  const step = STEPS[stepIdx];

  return (
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[80] pointer-events-none"
      >
        {/* Spotlight: box-shadow creates the dim backdrop with a cutout around the target */}
        {rect ? (
          <div
            className="fixed rounded-[10px] pointer-events-none"
            style={{
              top: rect.top - 5,
              left: rect.left - 5,
              width: rect.width + 10,
              height: rect.height + 10,
              boxShadow: "0 0 0 9999px rgba(15, 12, 8, 0.72)",
              transition: "top 0.35s cubic-bezier(0.16,1,0.3,1), left 0.35s cubic-bezier(0.16,1,0.3,1), width 0.35s cubic-bezier(0.16,1,0.3,1), height 0.35s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        ) : (
          <div className="fixed inset-0" style={{ background: "rgba(15, 12, 8, 0.72)" }} />
        )}

        {/* Pulsing gold ring around target */}
        {rect && (
          <motion.div
            className="fixed rounded-[12px] border-2 border-primary pointer-events-none"
            style={{
              top: rect.top - 7,
              left: rect.left - 7,
              width: rect.width + 14,
              height: rect.height + 14,
            }}
            animate={{
              boxShadow: [
                "0 0 0 0px rgba(196,146,42,0.55)",
                "0 0 0 8px rgba(196,146,42,0)",
              ],
            }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}

        {/* Tooltip — always centered on screen */}
        <div
          className="fixed inset-0 flex items-center justify-center px-5"
          style={{ zIndex: 2 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIdx}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm card-paper p-6 shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  <Compass size={12} strokeWidth={2.5} />
                  Paso {stepIdx + 1} de {STEPS.length}
                </div>
                <button
                  onClick={finish}
                  className="text-ink-muted hover:text-ink transition-colors"
                  aria-label="Cerrar tour"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Content */}
              <h3 className="font-display font-bold tracking-tight text-xl text-ink mb-2 leading-tight">
                {step.title}
              </h3>
              <p className="text-sm text-ink-2 leading-relaxed mb-5">{step.body}</p>

              {/* Target hint */}
              {rect && (
                <p className="text-[11px] text-primary/70 mb-4 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Mira el elemento resaltado
                </p>
              )}

              {/* Progress + actions */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === stepIdx ? "w-6 bg-primary" : "w-1.5 bg-line-medium"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {stepIdx === STEPS.length - 1 ? (
                    <button onClick={finish} className="btn btn-primary text-sm">
                      Listo
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={finish}
                        className="text-xs text-ink-muted hover:text-ink-2 transition-colors px-2 py-1"
                      >
                        Saltar
                      </button>
                      <button onClick={next} className="btn btn-primary text-sm">
                        Siguiente <ArrowRight size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

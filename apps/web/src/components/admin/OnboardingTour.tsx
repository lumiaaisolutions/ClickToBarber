"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Sparkles } from "lucide-react";

const STORAGE_KEY = "lumia_tour_v1_done";

interface Step {
  /** Selector relativo al sidebar — data-tour="<key>" en el link */
  target: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    target: "dashboard",
    title: "Tu pulso diario",
    body: "Aquí ves citas del día, ingresos del mes y clientes inactivos. Todo lo importante en un vistazo.",
  },
  {
    target: "agenda",
    title: "Calendario semanal",
    body: "Arrastra una cita a otro hueco para reagendar. Click en una cita para reasignar barbero o ver detalles.",
  },
  {
    target: "identity",
    title: "Tu identidad visual",
    body: "Cambia paleta, tipografías y logo. Lo que configures aquí se aplica al portal y al link público de tu barbería.",
  },
  {
    target: "services",
    title: "Catálogo y precios",
    body: "Define servicios, duración y precio. Es lo primero que tus clientes verán al reservar.",
  },
  {
    target: "pos",
    title: "POS e inventario",
    body: "Cobra al terminar el servicio. Si vendes producto, descuenta stock automáticamente y registra propinas.",
  },
];

/**
 * Tour del primer login. Se monta SOLO cuando localStorage no marca
 * `lumia_tour_v1_done`. El usuario puede dispararlo manualmente desde
 * el botón "Tour" del sidebar (event window 'lumia:tour:open').
 */
export function OnboardingTour({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (enabled && !window.localStorage.getItem(STORAGE_KEY)) {
      // Pequeño delay para que el sidebar termine de montar.
      const t = setTimeout(() => setOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, [enabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      setStepIdx(0);
      setOpen(true);
    };
    window.addEventListener("lumia:tour:open", handler);
    return () => window.removeEventListener("lumia:tour:open", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const target = document.querySelector<HTMLElement>(`[data-tour="${STEPS[stepIdx].target}"]`);
    if (!target) {
      setRect(null);
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
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
  const tooltipStyle: React.CSSProperties = rect
    ? {
        top: Math.min(window.innerHeight - 280, Math.max(20, rect.top + rect.height / 2 - 100)),
        left: Math.min(window.innerWidth - 360, rect.right + 20),
      }
    : { top: 80, left: "50%", transform: "translateX(-50%)" };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] pointer-events-none"
      >
        {/* Backdrop con hueco "spotlight" usando box-shadow de un div sin fondo */}
        {rect && (
          <div
            className="fixed rounded-[12px] pointer-events-auto"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: "0 0 0 9999px rgba(20, 24, 30, 0.55)",
              transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        )}
        {!rect && (
          <div className="fixed inset-0 bg-ink/60 pointer-events-auto" />
        )}

        {/* Tooltip */}
        <motion.div
          key={`tooltip-${stepIdx}`}
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-[81] w-[340px] max-w-[92vw] card-paper p-5 pointer-events-auto shadow-2xl"
          style={tooltipStyle}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-[10px] tracking-imperial text-accent-3">
              <Sparkles size={12} /> Paso {stepIdx + 1} de {STEPS.length}
            </div>
            <button
              onClick={finish}
              className="text-ink-muted hover:text-ink"
              aria-label="Cerrar tour"
            >
              <X size={14} />
            </button>
          </div>
          <h3 className="font-display italic text-xl text-ink mb-2">{step.title}</h3>
          <p className="text-sm text-ink-2 leading-relaxed mb-5">{step.body}</p>

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
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
                  <button onClick={finish} className="text-xs text-ink-muted hover:text-ink-2 px-2">
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
      </motion.div>
    </AnimatePresence>
  );
}

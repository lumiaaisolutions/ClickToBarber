"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";

/**
 * Preloader que cubre la pantalla durante la primera visita de la sesión.
 * Estrategia robusta: se quita siempre tras 1100ms desde que monta, sin
 * depender del evento `load` (que en dev con Turbopack/HMR puede tardar).
 * En navegaciones SPA posteriores no se vuelve a mostrar (sessionStorage).
 */
export function Preloader() {
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("bp:preload-shown") === "1") {
      return "hidden";
    }
    return "visible";
  });

  useEffect(() => {
    if (phase === "hidden") return;

    const fadeTimer = setTimeout(() => setPhase("fading"), 1100);
    const hideTimer = setTimeout(() => {
      setPhase("hidden");
      try { sessionStorage.setItem("bp:preload-shown", "1"); } catch {}
    }, 1100 + 480);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: "var(--bg-void)",
        opacity: phase === "fading" ? 0 : 1,
        transition: "opacity 480ms cubic-bezier(0.22,1,0.36,1)",
        pointerEvents: phase === "fading" ? "none" : "auto",
      }}
      aria-hidden={phase === "fading"}
    >
      <div className="animate-breathe">
        <Logo size={88} />
      </div>
      <div className="mt-8 font-display text-sm tracking-[0.4em] text-text-2 uppercase">
        BarberPro
      </div>
      <div className="mt-2 text-xs text-text-muted">Cargando experiencia premium…</div>
    </div>
  );
}

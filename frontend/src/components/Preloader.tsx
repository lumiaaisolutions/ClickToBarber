"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";

/**
 * Preloader LUMIA — papel manila + wordmark con tijera animada.
 * Aparece sólo en la primera visita de la sesión.
 */
export function Preloader() {
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("lumia:preload-shown") === "1") {
      return "hidden";
    }
    return "visible";
  });

  useEffect(() => {
    if (phase === "hidden") return;
    const fadeTimer = setTimeout(() => setPhase("fading"), 1100);
    const hideTimer = setTimeout(() => {
      setPhase("hidden");
      try { sessionStorage.setItem("lumia:preload-shown", "1"); } catch {}
    }, 1100 + 520);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center texture-paper"
      style={{
        background: "var(--bg-canvas)",
        opacity: phase === "fading" ? 0 : 1,
        transition: "opacity 520ms cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: phase === "fading" ? "none" : "auto",
      }}
      aria-hidden={phase === "fading"}
    >
      <div className="animate-breathe text-primary">
        <Logo size={56} />
      </div>
      <hr className="hairline-gold w-32 mt-10" />
      <div className="mt-6 font-display italic text-sm tracking-imperial text-ink-2">
        Software de barbería con identidad propia
      </div>
    </div>
  );
}

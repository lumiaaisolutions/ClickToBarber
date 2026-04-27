"use client";

import { useEffect } from "react";

/** Smooth scroll global con Lenis. Pasa el ticker a requestAnimationFrame nativo. */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const Lenis = (await import("lenis")).default;
      if (cancelled) return;
      const lenis = new Lenis({
        lerp: 0.10,
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.4,
      });
      let raf = 0;
      const tick = (t: number) => {
        lenis.raf(t);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      cleanup = () => {
        cancelAnimationFrame(raf);
        lenis.destroy();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return <>{children}</>;
}

"use client";

import { useEffect } from "react";

/**
 * Smooth scroll global con Lenis.
 * Usa el ticker de GSAP para el RAF — ambas librerías comparten el mismo
 * frame budget y ScrollTrigger recibe updates en cada tick de Lenis.
 * Sin esta integración, el pin de GSAP y Lenis compiten por el scroll.
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      const lenis = new Lenis({
        lerp: 0.08,
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.4,
        syncTouch: false,
      });

      // Notifica a ScrollTrigger cada vez que Lenis actualiza el scroll virtual
      lenis.on("scroll", ScrollTrigger.update);

      // Lenis vive dentro del ticker de GSAP — un solo loop de RAF
      const ticker = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(ticker);
      gsap.ticker.lagSmoothing(0);

      cleanup = () => {
        gsap.ticker.remove(ticker);
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

"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

/** Animates canvas with low-opacity film grain noise */
function FilmGrain({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;
    let skip = 0;
    function draw() {
      if (!canvas || !ctx) return;
      // ~12fps: only redraw every 5 RAF frames for vintage film feel
      skip = (skip + 1) % 5;
      if (skip === 0) {
        canvas.width  = canvas.offsetWidth  || 400;
        canvas.height = canvas.offsetHeight || 400;
        const w = canvas.width;
        const h = canvas.height;
        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const v = Math.random() * 255 | 0;
          data[i] = v; data[i+1] = v; data[i+2] = v; data[i+3] = 26;
        }
        ctx.putImageData(imageData, 0, 0);
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

/**
 * Image sequence scrubbing — patrón Apple usando GSAP + ScrollTrigger.
 *
 * Cómo funciona:
 *   1. La sección se PIN-ea durante un scroll de ~3x altura de viewport.
 *   2. ScrollTrigger emite `scrub: 1` (suaviza la animación 1s).
 *   3. Una timeline cross-fadea entre 4 escenas (fotos reales Unsplash),
 *      sincronizando texto + foto + scale + opacity con el progreso.
 *   4. cleanup() destruye triggers al unmount → cero leaks.
 */

interface Scene {
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
  description: string;
}

/**
 * Fotos Unsplash verificadas con `photo-*` IDs estables.
 * Si alguna se cae en producción, cambiamos a otra del mismo perfil.
 */
const SCENES: Scene[] = [
  {
    src: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1400&q=80",
    alt: "Cliente abriendo el sitio de la barbería en su celular",
    eyebrow: "Paso 1",
    title: "Tu cliente reserva",
    description: "Abre tu link, elige servicio, barbero y hora. Sin descargar nada, sin llamadas.",
  },
  {
    src: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=1400&q=80",
    alt: "Notificación de WhatsApp con confirmación de cita",
    eyebrow: "Paso 2",
    title: "Le llega un WhatsApp",
    description: "Confirmación al instante, recordatorio 2 horas antes y un botón para confirmar o reagendar.",
  },
  {
    src: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1400&q=80",
    alt: "Barbero atendiendo a un cliente con tijeras",
    eyebrow: "Paso 3",
    title: "Tú lo atiendes",
    description: "Llega puntual. La cita ya está en tu agenda con su servicio. Tú te enfocas en cortar.",
  },
  {
    src: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1400&q=80",
    alt: "Barbería moderna, ambiente premium",
    eyebrow: "Paso 4",
    title: "Vuelve solo",
    description: "Le mandamos una invitación cuando sea momento de regresar. Tú no piensas en eso.",
  },
];

export function LandingScrollScrub() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const slides = gsap.utils.toArray<HTMLElement>(".ctb-scene");
      const textBlocks = gsap.utils.toArray<HTMLElement>(".ctb-text");

      // Estado inicial — solo la primera escena visible
      gsap.set(slides, { opacity: 0, scale: 1.05 });
      gsap.set(slides[0], { opacity: 1, scale: 1 });
      gsap.set(textBlocks, { opacity: 0, y: 20 });
      gsap.set(textBlocks[0], { opacity: 1, y: 0 });

      // Timeline pin + scrub
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${(SCENES.length - 1) * window.innerHeight}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Para cada par i → i+1, crossfade
      for (let i = 0; i < slides.length - 1; i++) {
        const dur = 1;
        tl.to(slides[i], { opacity: 0, scale: 1.05, duration: dur, ease: "power2.inOut" }, i)
          .to(slides[i + 1], { opacity: 1, scale: 1, duration: dur, ease: "power2.inOut" }, i)
          .to(textBlocks[i], { opacity: 0, y: -20, duration: dur * 0.5, ease: "power2.in" }, i)
          .fromTo(
            textBlocks[i + 1],
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: dur * 0.5, ease: "power2.out" },
            i + dur * 0.5,
          );
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ height: "100vh" }}
    >
      {/* Background gradient vintage */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(196,146,42,0.09), transparent 55%), radial-gradient(ellipse at bottom, rgba(139,90,43,0.07), transparent 55%)",
        }}
      />

      <div className="relative h-full w-full flex flex-col lg:flex-row">
        {/* Lado izquierdo — Imágenes (stack absoluto) */}
        <div className="relative flex-1 flex items-center justify-center px-6 py-10 lg:py-0">
          <div className="relative w-full max-w-xl aspect-[4/5] rounded-3xl overflow-hidden shadow-[0_24px_80px_-16px_rgba(15,23,42,0.25)]">
            {SCENES.map((s, i) => (
              <div
                key={s.src}
                className="ctb-scene absolute inset-0"
                aria-hidden={i !== 0}
              >
                <Image
                  src={s.src}
                  alt={s.alt}
                  fill
                  priority={i === 0}
                  className="object-cover"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
                {/* Sepia warmth overlay — vintage tone */}
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "rgba(196,146,42,0.12)",
                    mixBlendMode: "multiply",
                  }}
                />
                {/* Vignette edges */}
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse at center, transparent 40%, rgba(28,23,20,0.45) 100%)",
                  }}
                />
                {/* Film grain layer */}
                <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.08 }}>
                  <FilmGrain />
                </div>
                {/* Badge esquina con número de paso */}
                <div className="absolute top-5 left-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-paper/95 backdrop-blur-sm text-xs font-semibold text-primary border border-primary/20">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span className="opacity-50">/</span>
                  <span className="opacity-50">{String(SCENES.length).padStart(2, "0")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lado derecho — Texto */}
        <div className="relative flex-1 flex items-center justify-center px-6 py-10 lg:py-0 lg:pr-12 xl:pr-20">
          <div className="relative w-full max-w-md">
            {SCENES.map((s, i) => (
              <div
                key={i}
                className="ctb-text absolute inset-0 flex flex-col justify-center"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                  {s.eyebrow}
                </div>
                <h2 className="text-4xl sm:text-5xl xl:text-6xl font-display leading-[1.05] text-ink tracking-tight">
                  {s.title}
                </h2>
                <p className="mt-5 text-base sm:text-lg text-ink-2 leading-relaxed">
                  {s.description}
                </p>
                {/* CTA solo en última escena */}
                {i === SCENES.length - 1 && (
                  <Link
                    href="/precios"
                    className="mt-8 inline-flex items-center gap-2 self-start btn btn-primary px-6 py-3"
                  >
                    Empezar gratis
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            ))}

            {/* Spacer invisible para que el contenedor tenga altura */}
            <div className="invisible">
              <div className="text-xs mb-3">x</div>
              <div className="text-4xl sm:text-5xl xl:text-6xl leading-[1.05]">
                Placeholder
                <br />
                largo
              </div>
              <p className="mt-5 text-base sm:text-lg">
                Línea uno suficientemente larga para reservar el espacio.
                Línea dos también ocupa espacio.
              </p>
              <div className="mt-8 h-12 w-40" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

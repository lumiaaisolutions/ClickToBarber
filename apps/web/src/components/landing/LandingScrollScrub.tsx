"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

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

interface Scene {
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
  description: string;
}

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

/* ─── Versión móvil: cards estáticas, scroll normal ──── */
function MobileScenes() {
  return (
    <section className="px-5 py-12 space-y-10">
      {SCENES.map((s, i) => (
        <div key={s.src} className="flex flex-col gap-5">
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-lg">
            <Image
              src={s.src}
              alt={s.alt}
              fill
              priority={i === 0}
              className="object-cover"
              sizes="100vw"
            />
            <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "rgba(196,146,42,0.12)", mixBlendMode: "multiply" }} />
            <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(28,23,20,0.45) 100%)" }} />
            <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-paper/95 text-xs font-semibold text-primary border border-primary/20">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span className="opacity-40">/</span>
              <span className="opacity-40">{String(SCENES.length).padStart(2, "0")}</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">{s.eyebrow}</div>
            <h2 className="text-3xl font-display font-bold leading-tight text-ink tracking-tight">{s.title}</h2>
            <p className="mt-3 text-base text-ink-2 leading-relaxed">{s.description}</p>
            {i === SCENES.length - 1 && (
              <Link href="/precios" className="mt-6 inline-flex items-center gap-2 btn btn-primary px-6 py-3">
                Empezar gratis <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

/* ─── Versión desktop: GSAP scrub ──── */
function DesktopScrub() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const slides = gsap.utils.toArray<HTMLElement>(".ctb-scene");
      const textBlocks = gsap.utils.toArray<HTMLElement>(".ctb-text");

      gsap.set(slides, { opacity: 0, scale: 1.05 });
      gsap.set(slides[0], { opacity: 1, scale: 1 });
      gsap.set(textBlocks, { opacity: 0, y: 20 });
      gsap.set(textBlocks[0], { opacity: 1, y: 0 });

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
      className="relative"
      style={{ height: "100vh" }}
    >
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "radial-gradient(ellipse at top, rgba(196,146,42,0.09), transparent 55%), radial-gradient(ellipse at bottom, rgba(139,90,43,0.07), transparent 55%)" }} />

      <div className="relative h-full w-full flex">
        {/* Imágenes */}
        <div className="relative flex-1 flex items-center justify-center px-8 py-8">
          <div className="relative w-full max-w-lg aspect-[4/5] rounded-3xl overflow-hidden shadow-[0_24px_80px_-16px_rgba(15,23,42,0.25)]">
            {SCENES.map((s, i) => (
              <div key={s.src} className="ctb-scene absolute inset-0" aria-hidden={i !== 0}>
                <Image
                  src={s.src}
                  alt={s.alt}
                  fill
                  priority={i === 0}
                  className="object-cover"
                  sizes="50vw"
                />
                <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "rgba(196,146,42,0.12)", mixBlendMode: "multiply" }} />
                <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(28,23,20,0.45) 100%)" }} />
                <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.08 }}>
                  <FilmGrain />
                </div>
                <div className="absolute top-5 left-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-paper/95 backdrop-blur-sm text-xs font-semibold text-primary border border-primary/20">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span className="opacity-50">/</span>
                  <span className="opacity-50">{String(SCENES.length).padStart(2, "0")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Texto */}
        <div className="relative flex-1 flex items-center justify-center px-8 xl:pr-20">
          <div className="relative w-full max-w-md">
            {SCENES.map((s, i) => (
              <div key={i} className="ctb-text absolute inset-0 flex flex-col justify-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">{s.eyebrow}</div>
                <h2 className="text-5xl xl:text-6xl font-display leading-[1.05] text-ink tracking-tight">{s.title}</h2>
                <p className="mt-5 text-lg text-ink-2 leading-relaxed">{s.description}</p>
                {i === SCENES.length - 1 && (
                  <Link href="/precios" className="mt-8 inline-flex items-center gap-2 self-start btn btn-primary px-6 py-3">
                    Empezar gratis <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            ))}
            <div className="invisible" aria-hidden>
              <div className="text-xs mb-3">x</div>
              <div className="text-5xl xl:text-6xl leading-[1.05]">Placeholder<br />largo</div>
              <p className="mt-5 text-lg">Línea uno suficientemente larga.<br />Línea dos también ocupa.</p>
              <div className="mt-8 h-12 w-40" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Componente público: elige versión según viewport ── */
export function LandingScrollScrub() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // SSR: renderiza versión móvil por defecto (no bloquea scroll en SSR)
  if (isDesktop === null) return <MobileScenes />;
  return isDesktop ? <DesktopScrub /> : <MobileScenes />;
}

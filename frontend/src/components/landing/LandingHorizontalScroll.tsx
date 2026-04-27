"use client";

import { useEffect, useRef } from "react";
import { CalendarCheck, MessageSquare, AlertTriangle, PhoneCall, ShieldX } from "lucide-react";

/**
 * Sección con scroll-jacking horizontal usando GSAP + ScrollTrigger.
 * Narra el journey "anti no-show": confirmación → recordatorio → cancelación si no responde.
 */
export function LandingHorizontalScroll() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ctx: { revert: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const gsapMod = await import("gsap");
      const stMod = await import("gsap/ScrollTrigger");
      if (cancelled || !sectionRef.current || !trackRef.current) return;
      const gsap = gsapMod.default;
      const ScrollTrigger = stMod.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const track = trackRef.current!;
        const distance = track.scrollWidth - window.innerWidth;
        gsap.to(track, {
          x: -distance,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: () => `+=${distance + 200}`,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
      }, sectionRef);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  const steps = [
    { icon: CalendarCheck, time: "T = 0", title: "Cliente reserva", desc: "Selecciona barbero, servicio, hora. Paga su depósito (30%). Cita pendiente.", color: "var(--accent)" },
    { icon: MessageSquare, time: "T − 24h", title: "WhatsApp recordatorio", desc: "Mensaje amigable en español con detalles de la cita.", color: "var(--info)" },
    { icon: AlertTriangle, time: "T − 2h", title: "Botones de acción", desc: "Confirmar / Reagendar / Cancelar. Un toque, cero fricción.", color: "var(--warning)" },
    { icon: PhoneCall, time: "T − 1h", title: "Twilio Voice", desc: "Si sigue sin responder, llamada automatizada. Último recurso.", color: "var(--accent-2)" },
    { icon: ShieldX, time: "T − 1h", title: "Cancelación automática", desc: "Sin respuesta = cita cancelada, slot liberado, depósito retenido.", color: "var(--danger)" },
  ];

  return (
    <section ref={sectionRef} id="anti-no-show" className="relative h-screen overflow-hidden">
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none">
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">Anti No-Show</div>
        <h2 className="font-display text-3xl sm:text-5xl">
          El reloj <span className="text-gold-gradient">trabaja para ti</span>
        </h2>
      </div>

      <div ref={trackRef} className="absolute inset-0 flex items-center gap-8 px-[12vw] pt-32 pb-16 will-change-transform">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card-premium w-[80vw] sm:w-[55vw] md:w-[45vw] lg:w-[36vw] shrink-0 p-10 relative">
              <div className="absolute top-6 right-6 font-mono text-xs text-text-muted tabular-nums">
                STEP 0{i + 1} / 0{steps.length}
              </div>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: `${s.color}1f`, color: s.color }}
              >
                <Icon size={28} strokeWidth={1.6} />
              </div>
              <div className="font-mono text-xs uppercase tracking-widest text-accent mb-2">{s.time}</div>
              <h3 className="font-display text-3xl mb-3">{s.title}</h3>
              <p className="text-text-2 text-base leading-relaxed">{s.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-text-muted text-xs">
        ↔ scroll para avanzar
      </div>
    </section>
  );
}

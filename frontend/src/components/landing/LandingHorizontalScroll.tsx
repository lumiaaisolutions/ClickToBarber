"use client";

import { motion } from "framer-motion";
import { CalendarCheck, MessageSquare, AlertTriangle, PhoneCall, ShieldX } from "lucide-react";

/**
 * Storytelling vertical "anti no-show" — reveals con clip-path,
 * paleta old money clara, sin scroll-jacking horizontal.
 */
export function LandingHorizontalScroll() {
  const steps = [
    { icon: CalendarCheck,  time: "T = 0",      title: "Cliente reserva",         desc: "Selecciona barbero, servicio, hora. Paga su depósito (30%). La cita queda pendiente." },
    { icon: MessageSquare,  time: "T − 24h",    title: "WhatsApp recordatorio",   desc: "Mensaje amigable en español con detalles de la cita." },
    { icon: AlertTriangle,  time: "T − 2h",     title: "Botones de acción",       desc: "Confirmar / Reagendar / Cancelar. Un toque, cero fricción." },
    { icon: PhoneCall,      time: "T − 1h",     title: "Twilio Voice",            desc: "Si sigue sin responder, llamada automatizada. Último recurso antes de cancelar." },
    { icon: ShieldX,        time: "T − 1h",     title: "Cancelación automática",  desc: "Sin respuesta = cita cancelada, slot liberado, depósito retenido." },
  ];

  return (
    <section id="anti-no-show" className="relative py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <div className="text-[10px] tracking-imperial text-accent-3 mb-4">Anti No-Show</div>
          <h2 className="font-display italic text-[clamp(2.4rem,5.5vw,5rem)] leading-[1.02] text-ink">
            El reloj
            <br />
            <span className="text-emerald-grad">trabaja para ti.</span>
          </h2>
        </motion.div>

        <div className="relative">
          {/* Línea vertical decorativa */}
          <div className="absolute left-[36px] top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-line-medium to-transparent hidden sm:block" />

          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-120px" }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
                className="relative flex gap-6 sm:gap-10 mb-10 last:mb-0"
              >
                <div className="shrink-0 w-[72px] h-[72px] rounded-full border border-line-strong bg-bg-paper flex items-center justify-center text-primary relative z-10 shadow-[0_8px_24px_-12px_rgba(31,61,43,0.25)]">
                  <Icon size={26} strokeWidth={1.5} />
                </div>

                <div className="flex-1 pt-2 pb-8 border-b border-line-fine last:border-b-0">
                  <div className="font-mono text-[10px] tracking-[0.32em] text-accent-3 mb-2">
                    STEP {String(i + 1).padStart(2, "0")} · {s.time}
                  </div>
                  <h3 className="font-display italic text-3xl text-ink mb-2">{s.title}</h3>
                  <p className="text-ink-2 leading-relaxed max-w-xl">{s.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

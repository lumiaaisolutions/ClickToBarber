"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;
const FADE = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } };

export function LandingHero() {
  return (
    <section className="relative min-h-[100vh] flex flex-col items-center justify-center px-6 pt-40 pb-24 text-center">
      {/* Sello superior */}
      <motion.div
        {...FADE}
        transition={{ duration: 0.7, ease: EASE, delay: 0.4 }}
        className="inline-flex items-center gap-3 text-[10px] tracking-imperial text-ink-2"
      >
        <span className="w-8 h-px bg-line-strong" />
        Edición Old Money · Multi-Tenant
        <span className="w-8 h-px bg-line-strong" />
      </motion.div>

      {/* Headline — minúsculas italic, peso visual abrumador */}
      <motion.h1
        {...FADE}
        transition={{ duration: 1.0, ease: EASE, delay: 0.55 }}
        className="mt-10 max-w-5xl font-display italic text-[clamp(3rem,8.5vw,7.8rem)] leading-[0.96] tracking-tight text-ink"
      >
        Software de barbería
        <br />
        con <span className="text-emerald-grad">identidad propia.</span>
      </motion.h1>

      <motion.p
        {...FADE}
        transition={{ duration: 0.9, ease: EASE, delay: 0.85 }}
        className="mt-10 max-w-2xl text-lg text-ink-2 leading-relaxed"
      >
        Una plataforma. Cada barbería con su propia paleta, su propio logo, su propia voz.
        Agenda, anti no-show, marketing y POS — sin perder lo que te hace único.
      </motion.p>

      <motion.div
        {...FADE}
        transition={{ duration: 0.8, ease: EASE, delay: 1.05 }}
        className="mt-12 flex flex-col sm:flex-row gap-3"
      >
        <Link href="/precios" className="btn btn-primary px-8 py-4 inline-flex items-center gap-2">
          Cotizar mi barbería
          <ArrowRight size={16} />
        </Link>
        <Link href="/b/el-navajazo" className="btn btn-ghost px-8 py-4">
          Ver demo de cliente
        </Link>
      </motion.div>

      {/* Línea con cifras — old money típico */}
      <motion.div
        {...FADE}
        transition={{ duration: 0.9, ease: EASE, delay: 1.3 }}
        className="mt-24 grid grid-cols-3 gap-8 sm:gap-16 max-w-3xl w-full"
      >
        <Cifra label="Reservas online" value="24/7" hint="sin llamadas perdidas" />
        <Cifra label="No-show" value="−87%" hint="confirmación automática" />
        <Cifra label="Retención" value="+34%" hint="campañas en un clic" />
      </motion.div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-ink-muted text-[10px] tracking-imperial flex flex-col items-center gap-2">
        <span>Desliza</span>
        <span className="w-px h-8 bg-line-medium" />
      </div>
    </section>
  );
}

function Cifra({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] tracking-imperial text-ink-muted">{label}</div>
      <div className="font-display text-4xl sm:text-5xl text-primary mt-3 tabular-nums">{value}</div>
      <div className="text-xs text-ink-2 mt-2 italic">{hint}</div>
    </div>
  );
}

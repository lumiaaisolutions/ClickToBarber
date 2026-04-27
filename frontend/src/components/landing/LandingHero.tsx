"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Calendar, ShieldCheck, Sparkles } from "lucide-react";

const FADE = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };
const EASE = [0.22, 1, 0.36, 1] as const;

export function LandingHero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-16 text-center">
      <motion.div
        {...FADE}
        transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border-strong bg-bg-elevated/40 backdrop-blur-md text-xs uppercase tracking-[0.25em] text-accent-2"
      >
        <Sparkles size={14} />
        SaaS Multi-Tenant para Barberías
      </motion.div>

      <motion.h1
        {...FADE}
        transition={{ duration: 0.9, ease: EASE, delay: 0.7 }}
        className="mt-8 max-w-5xl font-display text-5xl sm:text-7xl md:text-8xl leading-[1.02] tracking-tight"
      >
        La barbería ya tiene navaja.
        <br />
        <span className="text-gold-gradient">Ahora tiene sistema.</span>
      </motion.h1>

      <motion.p
        {...FADE}
        transition={{ duration: 0.8, ease: EASE, delay: 1.0 }}
        className="mt-8 max-w-2xl text-lg text-text-2"
      >
        Agenda inteligente, anti no-show con WhatsApp + llamada Twilio, marketing de retención
        en un clic, POS y finanzas. Todo en una sola plataforma. Tu cliente ya está esperando.
      </motion.p>

      <motion.div
        {...FADE}
        transition={{ duration: 0.7, ease: EASE, delay: 1.2 }}
        className="mt-10 flex flex-col sm:flex-row gap-3"
      >
        <Link
          href="/b/el-navajazo"
          className="btn-gold px-8 py-4 rounded-full text-base font-medium inline-flex items-center gap-2"
        >
          Probar como cliente
          <ArrowRight size={18} />
        </Link>
        <Link
          href="/admin"
          className="btn-ghost px-8 py-4 rounded-full text-base font-medium inline-flex items-center gap-2"
        >
          Ver portal Admin
        </Link>
      </motion.div>

      <motion.div
        {...FADE}
        transition={{ duration: 0.8, ease: EASE, delay: 1.5 }}
        className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full"
      >
        <Stat icon={<Calendar size={20} />} label="Reservas online" value="24/7" hint="Sin llamadas perdidas" />
        <Stat icon={<ShieldCheck size={20} />} label="Anti no-show" value="−87%" hint="Confirmación automática" />
        <Stat icon={<Sparkles size={20} />} label="Retención" value="+34%" hint="Marketing en un clic" />
      </motion.div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-text-muted text-xs animate-bounce">
        ↓ Desliza
      </div>
    </section>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="card-premium p-5 text-left">
      <div className="flex items-center gap-2 text-accent">
        {icon}
        <span className="text-xs uppercase tracking-wider text-text-muted">{label}</span>
      </div>
      <div className="font-display text-3xl text-text mt-2">{value}</div>
      <div className="text-sm text-text-2 mt-1">{hint}</div>
    </div>
  );
}

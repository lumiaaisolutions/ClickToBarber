"use client";

import { motion } from "framer-motion";
import { Calendar, MessageCircle, PhoneCall, ShoppingBag, Users, BarChart3, Sparkles, Palette } from "lucide-react";

const FEATURES = [
  { icon: Calendar,      title: "Agenda viva",          desc: "Calendario por barbero con slots inteligentes y validación contra horarios.", tag: "Core" },
  { icon: MessageCircle, title: "WhatsApp anti no-show", desc: "Confirmación T-2h con botones. Sin respuesta a 1h = cancelación automática.", tag: "Pro" },
  { icon: PhoneCall,     title: "Llamada Twilio",        desc: "Último recurso antes de cancelar. El cliente lo siente, el ticket se respeta.", tag: "Pro" },
  { icon: ShoppingBag,   title: "POS + Inventario",      desc: "Cobra servicios y productos. Stock se actualiza atómicamente al cobrar.", tag: "Pro" },
  { icon: Users,         title: "Multi-rol",             desc: "Admin, Recepción, Barbero, Gerente. Cada uno con su vista y sus permisos.", tag: "Starter" },
  { icon: Sparkles,      title: "Retención 1-clic",      desc: "Detecta clientes inactivos +30 días. WhatsApp con cupón único trazable.", tag: "Pro" },
  { icon: BarChart3,     title: "Finanzas",              desc: "Cierre de caja, comisiones, reportes contables exportables.", tag: "Enterprise" },
  { icon: Palette,       title: "White-label nativo",    desc: "Tu paleta, tu logo, tu tipografía. Cada link de barbería con su propia identidad.", tag: "Core" },
];

export function LandingFeatures() {
  return (
    <section id="features" className="relative py-20 sm:py-32 px-4 sm:px-6 bg-bg-paper/40">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12 sm:mb-20"
        >
          <div className="text-[10px] tracking-imperial text-accent-3 mb-3 sm:mb-4">Funciones</div>
          <h2 className="font-display italic text-[clamp(2rem,5.5vw,5rem)] leading-[1.05] sm:leading-[1.02] text-ink">
            Todo lo que la barbería
            <br />
            <span className="text-emerald-grad">necesita.</span>
          </h2>
          <p className="mt-5 sm:mt-6 text-sm sm:text-base text-ink-2 max-w-2xl mx-auto leading-relaxed">
            Cada función visible. Las premium con candado dorado. El cliente ve lo que se está perdiendo.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
                className="card-paper p-5 sm:p-6 lg:p-7 group hover:shadow-[0_28px_56px_-30px_rgba(31,61,43,0.32)] transition-all duration-500"
              >
                <div className="flex items-start justify-between mb-4 sm:mb-5">
                  <div className="p-2 sm:p-2.5 rounded-[12px] bg-primary/8 text-primary border border-primary/16 group-hover:bg-primary/12 transition-colors duration-500">
                    <Icon size={18} strokeWidth={1.5} className="sm:[&]:size-5" />
                  </div>
                  <span className="text-[9px] tracking-imperial px-2 py-1 rounded-full border border-line-medium text-ink-muted">
                    {f.tag}
                  </span>
                </div>
                <h3 className="font-display italic text-xl sm:text-2xl mb-2 text-ink">{f.title}</h3>
                <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

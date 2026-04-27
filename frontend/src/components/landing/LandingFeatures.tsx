"use client";

import { motion } from "framer-motion";
import { Calendar, MessageCircle, PhoneCall, ShoppingBag, Users, BarChart3, Sparkles, Zap } from "lucide-react";

const FEATURES = [
  { icon: Calendar, title: "Agenda viva", desc: "Calendario por barbero, slots inteligentes y validación contra horarios y no-show.", tag: "Core" },
  { icon: MessageCircle, title: "WhatsApp anti no-show", desc: "Confirmación T-2h con botones. Sin respuesta a 1h = cancelación automática.", tag: "Pro" },
  { icon: PhoneCall, title: "Llamada Twilio", desc: "Último recurso antes de cancelar. El cliente lo siente, el ticket se respeta.", tag: "Pro" },
  { icon: ShoppingBag, title: "POS + Inventario", desc: "Cobra servicios y productos. Stock se actualiza atómicamente al cobrar.", tag: "Pro" },
  { icon: Users, title: "Multi-barbero", desc: "Cada uno con sus horarios, sus servicios, su comisión.", tag: "Starter" },
  { icon: Sparkles, title: "Retención 1-clic", desc: "Detecta clientes inactivos +30 días. WhatsApp con cupón único trazable.", tag: "Pro" },
  { icon: BarChart3, title: "Finanzas", desc: "Cierre de caja, comisiones, reportes contables exportables.", tag: "Enterprise" },
  { icon: Zap, title: "Multi-tenant nativo", desc: "Aislamiento por tenant_id + Row Level Security en PostgreSQL.", tag: "Core" },
];

export function LandingFeatures() {
  return (
    <section id="features" className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Funcionalidades</div>
          <h2 className="font-display text-4xl sm:text-6xl tracking-tight">
            Todo lo que la <span className="text-gold-gradient">barbería</span> necesita
          </h2>
          <p className="mt-4 text-text-2 max-w-2xl mx-auto">
            Cada feature visible. Las premium con candado dorado. El cliente ve lo que se está perdiendo.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
                className="card-premium p-6 group hover:border-border-strong transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-accent/10 text-accent group-hover:bg-accent/20 transition">
                    <Icon size={22} strokeWidth={1.6} />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-border-medium text-text-muted">
                    {f.tag}
                  </span>
                </div>
                <h3 className="font-display text-xl mb-2">{f.title}</h3>
                <p className="text-sm text-text-2 leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

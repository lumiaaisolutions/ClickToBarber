"use client";

import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import type { Plan } from "@/lib/api";
import { cn } from "@/lib/utils";

const ALL_FEATURES: { code: string; label: string }[] = [
  { code: "online_booking",      label: "Reservas online 24/7" },
  { code: "multi_barbers",       label: "Múltiples barberos (hasta 5)" },
  { code: "whatsapp",            label: "Notificaciones WhatsApp" },
  { code: "twilio_voice",        label: "Llamada automatizada Twilio" },
  { code: "pos_inventory",       label: "POS + Inventario" },
  { code: "marketing_retention", label: "Marketing de retención" },
  { code: "finance_reports",     label: "Reportes financieros avanzados" },
  { code: "multi_branch",        label: "Multi-sucursal" },
  { code: "public_api",          label: "API pública" },
];

export function LandingPricing({ plans }: { plans: Plan[] }) {
  return (
    <section id="pricing" className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Planes</div>
          <h2 className="font-display text-4xl sm:text-6xl tracking-tight">
            Elige tu <span className="text-gold-gradient">filo</span>
          </h2>
          <p className="mt-4 text-text-2 max-w-2xl mx-auto">
            Toda función premium permanece visible con candado. Cuando estés listo, sube de plan.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan, i) => {
            const isPro = plan.code === "pro";
            return (
              <motion.div
                key={plan.code}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
                className={cn(
                  "relative p-7 rounded-[20px] flex flex-col",
                  isPro
                    ? "bg-gradient-to-b from-accent/15 via-bg-elevated to-bg-base border-2 border-border-strong shadow-[0_24px_64px_-24px_rgba(201,169,97,0.5)]"
                    : "card-premium",
                )}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest font-medium px-3 py-1 rounded-full btn-gold">
                    Más popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-display text-2xl">{plan.name}</h3>
                  <p className="text-sm text-text-2 mt-1 min-h-[40px]">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <div className="font-display text-4xl font-semibold tabular-nums">
                    {plan.price_cents === 0 ? "Gratis" : plan.price.replace(" MXN", "")}
                  </div>
                  {plan.price_cents > 0 && <div className="text-xs text-text-muted">MXN / mes</div>}
                </div>

                <ul className="space-y-2.5 mb-7 flex-1">
                  {ALL_FEATURES.map((f) => {
                    const has = plan.features.includes(f.code);
                    return (
                      <li key={f.code} className={cn("flex items-start gap-2.5 text-sm", has ? "text-text" : "text-text-muted")}>
                        {has ? (
                          <Check size={16} className="text-accent mt-0.5 shrink-0" />
                        ) : (
                          <Lock size={14} className="text-text-muted mt-0.5 shrink-0" />
                        )}
                        <span className={!has ? "line-through opacity-60" : undefined}>{f.label}</span>
                      </li>
                    );
                  })}
                </ul>

                <button
                  className={cn(
                    "w-full py-3 rounded-full text-sm font-medium transition",
                    isPro ? "btn-gold" : "btn-ghost",
                  )}
                >
                  {plan.code === "free" ? "Empezar gratis" : "Elegir plan"}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

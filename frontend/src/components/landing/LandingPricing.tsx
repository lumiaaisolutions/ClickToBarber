"use client";

import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import Link from "next/link";
import type { Plan } from "@/lib/api";
import { cn } from "@/lib/utils";

const ALL_FEATURES: { code: string; label: string; group: string }[] = [
  // Producto
  { code: "online_booking",      label: "Reservas online 24/7",            group: "Producto" },
  { code: "multi_barbers",       label: "Múltiples barberos",              group: "Producto" },
  { code: "whatsapp",            label: "Notificaciones WhatsApp",         group: "Producto" },
  { code: "twilio_voice",        label: "Llamada automatizada Twilio",     group: "Producto" },
  { code: "pos_inventory",       label: "POS + Inventario",                group: "Producto" },
  { code: "marketing_retention", label: "Marketing de retención",          group: "Producto" },
  { code: "finance_reports",     label: "Reportes financieros avanzados",  group: "Producto" },
  { code: "multi_branch",        label: "Multi-sucursal",                  group: "Producto" },
  { code: "public_api",          label: "API pública",                     group: "Producto" },
  // Roles incluidos
  { code: "role_admin",          label: "Rol Admin",                       group: "Roles" },
  { code: "role_barber",         label: "Rol Barbero (mis horarios)",      group: "Roles" },
  { code: "role_receptionist",   label: "Rol Recepción",                   group: "Roles" },
  { code: "role_manager",        label: "Rol Gerente",                     group: "Roles" },
  // White-label
  { code: "branding_basic",      label: "Branding básico (1 preset)",      group: "Identidad" },
  { code: "branding_full",       label: "Branding completo (4 presets + custom)", group: "Identidad" },
  { code: "custom_domain",       label: "Dominio personalizado",           group: "Identidad" },
];

// Mapa: además de los features oficiales del backend, agregamos los meta-features
// derivados del plan (rol, branding) para mostrar al usuario qué incluye cada plan.
const META_FEATURES_BY_PLAN: Record<string, string[]> = {
  free:       ["role_admin", "branding_basic"],
  starter:    ["role_admin", "role_barber", "branding_basic"],
  pro:        ["role_admin", "role_barber", "role_receptionist", "branding_full"],
  enterprise: ["role_admin", "role_barber", "role_receptionist", "role_manager", "branding_full", "custom_domain"],
};

export function LandingPricing({ plans }: { plans: Plan[] }) {
  return (
    <section id="pricing" className="relative py-32 px-6 bg-bg-paper/40">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <div className="text-[10px] tracking-imperial text-accent-3 mb-4">Planes</div>
          <h2 className="font-display italic text-[clamp(2.4rem,5.5vw,5rem)] leading-[1.02] text-ink">
            Elige tu <span className="text-emerald-grad">filo.</span>
          </h2>
          <p className="mt-6 text-ink-2 max-w-2xl mx-auto leading-relaxed">
            Toda función premium permanece visible con candado dorado. Cuando estés listo, sube de plan
            sin migración.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan, i) => {
            const isPro = plan.code === "pro";
            const allFeatures = [...plan.features, ...(META_FEATURES_BY_PLAN[plan.code] ?? [])];
            return (
              <motion.div
                key={plan.code}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.07 }}
                className={cn(
                  "relative p-7 flex flex-col rounded-[18px] transition-all duration-500",
                  isPro
                    ? "bg-gradient-to-b from-bg-paper via-bg-canvas to-bg-paper border-2 border-primary/40 shadow-[0_28px_72px_-32px_rgba(31,61,43,0.42)]"
                    : "card-paper hover:shadow-[0_28px_56px_-30px_rgba(31,61,43,0.32)]",
                )}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] tracking-imperial px-4 py-1 rounded-full bg-primary text-bg-canvas font-display italic">
                    Más elegido
                  </div>
                )}

                <div className="mb-6">
                  <div className="text-[10px] tracking-imperial text-accent-3 mb-2">
                    Plan {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="font-display italic text-3xl text-ink">{plan.name}</h3>
                  <p className="text-sm text-ink-2 mt-2 min-h-[44px] leading-relaxed">{plan.description}</p>
                </div>

                <div className="mb-7">
                  <div className="font-display text-5xl font-medium tabular-nums text-ink">
                    {plan.price_cents === 0 ? "$0" : plan.price.replace(" MXN", "")}
                  </div>
                  <div className="text-[10px] tracking-imperial text-ink-muted mt-1">
                    {plan.price_cents === 0 ? "Para siempre" : "MXN / mes"}
                  </div>
                </div>

                <hr className="hairline mb-5" />

                <ul className="space-y-2 mb-7 flex-1">
                  {ALL_FEATURES.map((f) => {
                    const has = allFeatures.includes(f.code);
                    return (
                      <li
                        key={f.code}
                        className={cn(
                          "flex items-start gap-2 text-sm",
                          has ? "text-ink" : "text-ink-muted",
                        )}
                      >
                        {has ? (
                          <Check size={14} className="text-primary mt-1 shrink-0" strokeWidth={2} />
                        ) : (
                          <Lock size={12} className="text-ink-muted mt-1 shrink-0" />
                        )}
                        <span className={cn("leading-snug", !has && "line-through opacity-60")}>{f.label}</span>
                      </li>
                    );
                  })}
                </ul>

                <Link
                  href={`/precios?plan=${plan.code}`}
                  className={cn(
                    "btn w-full justify-center",
                    isPro ? "btn-primary" : "btn-ghost",
                  )}
                >
                  {plan.code === "free" ? "Empezar gratis" : "Cotizar plan"}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

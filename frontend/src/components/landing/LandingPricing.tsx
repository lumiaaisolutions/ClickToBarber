"use client";

import { motion } from "framer-motion";
import { Check, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Plan } from "@/lib/api";
import { cn } from "@/lib/utils";

interface FeatureRow {
  code: string;
  label: string;
  highlight?: boolean;
}

const FEATURES: FeatureRow[] = [
  { code: "online_booking",      label: "Reservas online 24/7" },
  { code: "multi_barbers",       label: "Múltiples barberos" },
  { code: "whatsapp",            label: "Notificaciones WhatsApp" },
  { code: "twilio_voice",        label: "Llamada automatizada" },
  { code: "pos_inventory",       label: "POS + Inventario", highlight: true },
  { code: "marketing_retention", label: "Marketing de retención", highlight: true },
  { code: "finance_reports",     label: "Reportes financieros" },
  { code: "multi_branch",        label: "Multi-sucursal" },
  { code: "public_api",          label: "API pública" },
  { code: "branding_full",       label: "Branding completo (4 presets)" },
  { code: "role_receptionist",   label: "Rol Recepción" },
  { code: "role_manager",        label: "Rol Gerente" },
  { code: "custom_domain",       label: "Dominio personalizado" },
];

// Sólo los features que están en el back; el resto son meta-features
// derivados del plan que añadimos al set para mostrarlos en la UI.
const META_FEATURES_BY_PLAN: Record<string, string[]> = {
  free:       ["branding_basic"],
  starter:    ["branding_basic"],
  pro:        ["branding_full", "role_receptionist"],
  enterprise: ["branding_full", "role_receptionist", "role_manager", "custom_domain"],
};

const PLAN_BADGE: Record<string, string | undefined> = {
  pro: "Más elegido",
  enterprise: "Para cadenas",
};

const PLAN_TAGLINE: Record<string, string> = {
  free:       "Para quienes empiezan",
  starter:    "Para barberías de 2 a 5 sillas",
  pro:        "Para barberías de autor",
  enterprise: "Para cadenas y franquicias",
};

export function LandingPricing({ plans }: { plans: Plan[] }) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <section id="pricing" className="relative py-32 px-6 bg-bg-paper/40">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <div className="text-[10px] tracking-imperial text-accent-3 mb-4">Planes</div>
          <h2 className="font-display italic text-[clamp(2.4rem,5.5vw,5rem)] leading-[1.02] text-ink">
            Elige tu <span className="text-emerald-grad">filo.</span>
          </h2>
          <p className="mt-6 text-ink-2 max-w-xl mx-auto leading-relaxed">
            Sin permanencia. Sin migración al subir de plan. Toda función premium
            permanece visible con candado dorado hasta que la actives.
          </p>
        </motion.div>

        {/* Toggle facturación */}
        <div className="flex justify-center mb-12">
          <BillingToggle value={billing} onChange={setBilling} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {plans.map((plan, i) => (
            <PricingCard
              key={plan.code}
              plan={plan}
              billing={billing}
              index={i}
            />
          ))}
        </div>

        <p className="text-center text-xs text-ink-muted italic mt-10 max-w-xl mx-auto">
          Precios en MXN. Activamos tu cuenta de forma manual tras confirmar el pago —
          recibes credenciales y un wizard de identidad para personalizar tu portal.
        </p>
      </div>
    </section>
  );
}

function PricingCard({
  plan,
  billing,
  index,
}: {
  plan: Plan;
  billing: "monthly" | "yearly";
  index: number;
}) {
  const isPro = plan.code === "pro";
  const allFeatures = new Set([
    ...plan.features,
    ...(META_FEATURES_BY_PLAN[plan.code] ?? []),
  ]);
  const badge = PLAN_BADGE[plan.code];
  const tagline = PLAN_TAGLINE[plan.code] ?? plan.description;

  // Monto por mes con descuento anual del 20%
  const monthly = plan.price_cents;
  const effective = billing === "yearly" ? Math.round(monthly * 0.8) : monthly;
  const display = effective === 0 ? "$0" : `$${(effective / 100).toLocaleString("es-MX")}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: index * 0.06 }}
      className={cn(
        "relative flex flex-col p-7 rounded-[20px] transition-all duration-500",
        isPro
          ? "bg-bg-canvas border border-primary/35 shadow-[0_30px_60px_-32px_rgba(31,61,43,0.32)] ring-1 ring-primary/15"
          : "bg-bg-canvas border border-line-medium hover:border-primary/30 hover:shadow-[0_24px_48px_-32px_rgba(31,61,43,0.18)]",
      )}
    >
      {badge && (
        <span
          className={cn(
            "absolute top-5 right-5 text-[9px] tracking-imperial px-2.5 py-1 rounded-full",
            isPro
              ? "bg-primary text-bg-canvas"
              : "bg-accent/15 text-accent-3 border border-accent/30",
          )}
        >
          {badge}
        </span>
      )}

      <header className="mb-6">
        <h3 className="font-display italic text-3xl text-ink leading-tight">{plan.name}</h3>
        <p className="text-sm text-ink-2 mt-2 leading-snug min-h-[40px]">{tagline}</p>
      </header>

      <div className="mb-7 flex items-baseline gap-1.5">
        <span className="font-display italic text-5xl tabular-nums text-ink leading-none">
          {display}
        </span>
        {effective > 0 && (
          <span className="text-xs text-ink-muted">
            <span className="block leading-tight">MXN</span>
            <span className="block leading-tight">/ {billing === "yearly" ? "mes" : "mes"}</span>
          </span>
        )}
      </div>

      <Link
        href={`/precios?plan=${plan.code}`}
        className={cn(
          "btn justify-center text-sm mb-7",
          isPro ? "btn-primary" : "btn-ghost",
        )}
      >
        {plan.code === "free" ? "Empezar gratis" : "Cotizar plan"}
        <ArrowUpRight size={14} />
      </Link>

      <hr className="hairline mb-5" />

      <ul className="space-y-2.5 flex-1">
        {FEATURES.map((f) => {
          const has = allFeatures.has(f.code);
          if (!has) return null;
          return (
            <li
              key={f.code}
              className={cn(
                "flex items-start gap-2.5 text-sm leading-snug",
                f.highlight ? "text-ink" : "text-ink-2",
              )}
            >
              <Check
                size={14}
                strokeWidth={2.5}
                className={cn("mt-0.5 shrink-0", isPro ? "text-primary" : "text-accent-3")}
              />
              <span>{f.label}</span>
            </li>
          );
        })}
      </ul>
    </motion.article>
  );
}

function BillingToggle({
  value,
  onChange,
}: {
  value: "monthly" | "yearly";
  onChange: (v: "monthly" | "yearly") => void;
}) {
  return (
    <div className="inline-flex items-center p-1 rounded-full bg-bg-vellum border border-line-medium">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={cn(
          "px-5 py-2 rounded-full text-xs tracking-noble transition-all duration-300",
          value === "monthly" ? "bg-bg-canvas text-ink shadow-[0_2px_8px_-2px_rgba(31,61,43,0.18)]" : "text-ink-2",
        )}
      >
        Mensual
      </button>
      <button
        type="button"
        onClick={() => onChange("yearly")}
        className={cn(
          "px-5 py-2 rounded-full text-xs tracking-noble transition-all duration-300 inline-flex items-center gap-2",
          value === "yearly" ? "bg-bg-canvas text-ink shadow-[0_2px_8px_-2px_rgba(31,61,43,0.18)]" : "text-ink-2",
        )}
      >
        Anual
        <span className="text-[9px] tracking-imperial text-accent-3">−20%</span>
      </button>
    </div>
  );
}

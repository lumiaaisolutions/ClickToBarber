"use client";

import { motion } from "framer-motion";
import { Check, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Plan } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CheckoutDialog } from "./CheckoutDialog";

interface FeatureRow {
  code: string;
  label: string;
  highlight?: boolean;
}

/**
 * Cada `code` corresponde 1:1 con el feature que el FeatureGate del
 * backend usa para bloquear endpoints (`middleware('feature:CODE')`).
 *
 * Labels en español claro — sin jerga técnica. Si tu plan no incluye
 * un feature, ese módulo está bloqueado con candado en el admin hasta
 * que upgradees.
 */
const FEATURES: FeatureRow[] = [
  { code: "online_booking",      label: "Reservas online desde el celular" },
  { code: "multi_barbers",       label: "Varios barberos en tu equipo" },
  { code: "whatsapp",            label: "Recordatorios y confirmación por WhatsApp", highlight: true },
  { code: "twilio_voice",        label: "Llamadas automáticas a quien no responde" },
  { code: "pos_inventory",       label: "Cobra servicios y vende productos", highlight: true },
  { code: "marketing_retention", label: "Recupera clientes que no han vuelto", highlight: true },
  { code: "finance_reports",     label: "Reportes de ingresos y comisiones" },
  { code: "multi_branch",        label: "Varias sucursales" },
  { code: "public_api",          label: "Conexión con otras apps" },
];

// Sin meta-features inventados — solo lo que el backend realmente bloquea.
const META_FEATURES_BY_PLAN: Record<string, string[]> = {};

const PLAN_BADGE: Record<string, string | undefined> = {
  pro: "Más popular",
  enterprise: "Para cadenas",
};

const PLAN_TAGLINE: Record<string, string> = {
  free:       "Para empezar",
  starter:    "Para 2 a 5 sillas",
  pro:        "Para barberías que crecen",
  enterprise: "Para cadenas y franquicias",
};

export function LandingPricing({ plans }: { plans: Plan[] }) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [checkout, setCheckout] = useState<{
    plan: Plan;
    priceLabel: string;
  } | null>(null);

  return (
    <section id="pricing" className="relative py-20 sm:py-32 px-4 sm:px-6 bg-bg-paper/40">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10 sm:mb-14"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-accent-3 mb-3 sm:mb-4">Planes</div>
          <h2 className="font-display font-bold tracking-tight text-[clamp(2rem,5.5vw,5rem)] leading-[1.05] sm:leading-[1.02] text-ink">
            Elige tu <span className="text-emerald-grad">filo.</span>
          </h2>
          <p className="mt-5 sm:mt-6 text-sm sm:text-base text-ink-2 max-w-xl mx-auto leading-relaxed">
            Sin permanencia. Sin migración al subir de plan. Toda función premium
            permanece visible con candado dorado hasta que la actives.
          </p>
        </motion.div>

        {/* Banner: 15 días gratis */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="flex justify-center mb-6 sm:mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-300/60 bg-amber-50 text-amber-800 text-xs font-semibold">
            <span className="text-base">✂️</span>
            <span>15 días de prueba gratis en cualquier plan — sin tarjeta al inicio</span>
          </div>
        </motion.div>

        {/* Toggle facturación */}
        <div className="flex justify-center mb-8 sm:mb-12">
          <BillingToggle value={billing} onChange={setBilling} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {plans.map((plan, i) => (
            <PricingCard
              key={plan.code}
              plan={plan}
              billing={billing}
              index={i}
              onCheckout={(priceLabel) => setCheckout({ plan, priceLabel })}
            />
          ))}
        </div>

        <p className="text-center text-xs text-ink-muted italic mt-10 max-w-xl mx-auto">
          Pago seguro vía Stripe. Tras confirmar el pago recibes un correo con el
          enlace para terminar la configuración de tu portal.
        </p>
      </div>

      <CheckoutDialog
        open={!!checkout}
        onClose={() => setCheckout(null)}
        planSlug={checkout?.plan.code ?? ""}
        planName={checkout?.plan.name ?? ""}
        billingCycle={billing}
        priceLabel={checkout?.priceLabel ?? ""}
      />
    </section>
  );
}

function PricingCard({
  plan,
  billing,
  index,
  onCheckout,
}: {
  plan: Plan;
  billing: "monthly" | "yearly";
  index: number;
  onCheckout: (priceLabel: string) => void;
}) {
  const isPro = plan.code === "pro";
  const isFree = plan.code === "free";
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
  const priceLabel = `${display} MXN / mes`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: index * 0.06 }}
      className={cn(
        "relative flex flex-col p-5 sm:p-6 lg:p-7 rounded-[20px] transition-all duration-500",
        isPro
          ? "bg-bg-canvas border border-primary/35 shadow-[0_30px_60px_-32px_rgba(31,61,43,0.32)] ring-1 ring-primary/15"
          : "bg-bg-canvas border border-line-medium hover:border-primary/30 hover:shadow-[0_24px_48px_-32px_rgba(31,61,43,0.18)]",
      )}
    >
      {badge && (
        <span
          className={cn(
            "absolute top-5 right-5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full",
            isPro
              ? "bg-primary text-bg-canvas"
              : "bg-accent/15 text-accent-3 border border-accent/30",
          )}
        >
          {badge}
        </span>
      )}

      <header className="mb-5 sm:mb-6">
        <h3 className="font-display font-bold tracking-tight text-2xl sm:text-3xl text-ink leading-tight">{plan.name}</h3>
        {!isFree && (
          <div className="mt-2 mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            ✂️ 15 días gratis
          </div>
        )}
        <p className="text-xs sm:text-sm text-ink-2 mt-1.5 leading-snug sm:min-h-[40px]">{tagline}</p>
      </header>

      <div className="mb-6 sm:mb-7 flex items-baseline gap-1.5">
        <span className="font-display font-bold tracking-tight text-4xl sm:text-5xl tabular-nums text-ink leading-none">
          {display}
        </span>
        {effective > 0 && (
          <span className="text-xs text-ink-muted">
            <span className="block leading-tight">MXN</span>
            <span className="block leading-tight">/ {billing === "yearly" ? "mes" : "mes"}</span>
          </span>
        )}
      </div>

      {isFree ? (
        <Link
          href="/login"
          className={cn("btn justify-center text-sm mb-7", "btn-ghost")}
        >
          Empezar gratis <ArrowUpRight size={14} />
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => onCheckout(priceLabel)}
          className={cn(
            "btn justify-center text-sm mb-7",
            isPro ? "btn-primary" : "btn-ghost",
          )}
        >
          Activar este plan <ArrowUpRight size={14} />
        </button>
      )}

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
        <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-3">−20%</span>
      </button>
    </div>
  );
}

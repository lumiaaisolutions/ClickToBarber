import { api, type Plan } from "@/lib/api";
import { getDashboard } from "@/lib/admin-api";
import { Check, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ALL_FEATURES: Record<string, string> = {
  online_booking:      "Reservas online 24/7",
  multi_barbers:       "Múltiples barberos",
  whatsapp:            "Notificaciones WhatsApp",
  twilio_voice:        "Llamada Twilio",
  pos_inventory:       "POS + Inventario",
  marketing_retention: "Marketing de retención",
  finance_reports:     "Reportes financieros",
  multi_branch:        "Multi-sucursal",
  public_api:          "API pública",
};

export default async function BillingPage() {
  let plans: Plan[] = [];
  let currentPlan: string | null = null;
  try {
    plans = await api<Plan[]>("/billing/plans");
    const dash = await getDashboard();
    currentPlan = dash.tenant.plan;
  } catch {}

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">Suscripción</div>
        <h1 className="font-display text-4xl">Tu plan</h1>
        <p className="text-text-2 text-sm mt-1">
          Estás en el plan <span className="text-accent-2 font-medium uppercase">{currentPlan ?? "—"}</span>.
          Cambia cuando quieras, sin sorpresas.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => {
          const isCurrent = p.code === currentPlan;
          return (
            <div
              key={p.code}
              className={cn(
                "p-6 rounded-[18px] flex flex-col",
                isCurrent
                  ? "bg-gradient-to-b from-accent/15 via-bg-elevated to-bg-base border-2 border-accent"
                  : "card-premium",
              )}
            >
              {isCurrent && (
                <div className="text-[10px] uppercase tracking-widest text-accent mb-2 inline-flex items-center gap-1">
                  <Sparkles size={11} /> Plan actual
                </div>
              )}
              <h2 className="font-display text-2xl">{p.name}</h2>
              <p className="text-xs text-text-2 min-h-[40px] mt-1">{p.description}</p>
              <div className="font-display text-3xl mt-3 tabular-nums">
                {p.price_cents === 0 ? "Gratis" : p.price.replace(" MXN", "")}
              </div>
              {p.price_cents > 0 && <div className="text-xs text-text-muted">MXN / mes</div>}

              <ul className="space-y-1.5 mt-4 mb-5 text-sm">
                {Object.entries(ALL_FEATURES).map(([code, label]) => {
                  const has = p.features.includes(code);
                  return (
                    <li key={code} className={cn("flex items-start gap-2", has ? "text-text" : "text-text-muted")}>
                      {has ? <Check size={14} className="text-accent mt-0.5 shrink-0" /> : <Lock size={12} className="mt-0.5 shrink-0" />}
                      <span className={!has ? "line-through opacity-60" : undefined}>{label}</span>
                    </li>
                  );
                })}
              </ul>

              <button
                disabled={isCurrent}
                className={cn(
                  "mt-auto w-full py-2.5 rounded-full text-sm font-medium transition",
                  isCurrent ? "bg-bg-overlay text-text-muted cursor-not-allowed" : "btn-gold",
                )}
              >
                {isCurrent ? "Plan actual" : "Cambiar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

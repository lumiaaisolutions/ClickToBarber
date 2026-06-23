import { api, type Plan } from "@/lib/api";
import { getDashboard } from "@/lib/admin-api";
import { Check, Lock, Sparkles, Clock } from "lucide-react";
import Link from "next/link";
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
  let planStatus: string | null = null;
  let trialEndsAt: string | null = null;
  try {
    plans = await api<Plan[]>("/billing/plans");
    const dash = await getDashboard();
    currentPlan = dash.tenant.plan;
    planStatus = dash.tenant.plan_status ?? null;
    trialEndsAt = dash.tenant.trial_ends_at ?? null;
  } catch {}

  const isTrialing = planStatus === "trialing";
  let trialDaysLeft = 0;
  let trialEndDate = "";
  if (isTrialing && trialEndsAt) {
    const endsAt = new Date(trialEndsAt);
    const diff = endsAt.getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    trialEndDate = endsAt.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-accent-3 mb-3">Tu plan</div>
        <h1 className="font-display font-bold tracking-tight text-3xl sm:text-4xl text-ink">Mi plan</h1>
        <p className="text-ink-2 text-sm mt-3">
          Estás en <span className="text-primary font-semibold uppercase">{currentPlan ?? "—"}</span>.
          Cambia cuando quieras. Sin contratos.
        </p>
      </header>

      {isTrialing && (
        <div className="p-5 sm:p-6 rounded-2xl border border-amber-300/70 bg-amber-50/90">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <Clock size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">Prueba gratuita activa</div>
              <div className="font-display font-bold text-2xl text-amber-900 leading-tight">
                {trialDaysLeft > 0 ? `${trialDaysLeft} día${trialDaysLeft !== 1 ? "s" : ""} restantes` : "Tu prueba ha vencido"}
              </div>
              {trialEndDate && (
                <p className="text-sm text-amber-800 mt-1">Tu prueba termina el {trialEndDate}.</p>
              )}
              <div className="mt-3 h-2 bg-amber-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
                  style={{ width: `${Math.round(((15 - trialDaysLeft) / 15) * 100)}%` }}
                />
              </div>
              <div className="text-xs text-amber-700 mt-1.5">{15 - trialDaysLeft} de 15 días usados</div>
            </div>
            <Link href="#plans" className="btn btn-primary text-sm shrink-0">
              Activar plan ahora
            </Link>
          </div>
        </div>
      )}

      <div id="plans" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {plans.map((p) => {
          const isCurrent = p.code === currentPlan;
          return (
            <div
              key={p.code}
              className={cn(
                "p-5 sm:p-6 rounded-[18px] flex flex-col",
                isCurrent
                  ? "bg-gradient-to-b from-accent/15 via-bg-elevated to-bg-base border-2 border-accent"
                  : "card-paper",
              )}
            >
              {isCurrent && (
                <div className="text-[10px] uppercase tracking-widest text-accent mb-2 inline-flex items-center gap-1">
                  <Sparkles size={11} /> Plan actual
                </div>
              )}
              <h2 className="font-display text-xl sm:text-2xl">{p.name}</h2>
              <p className="text-xs text-ink-2 sm:min-h-[40px] mt-1">{p.description}</p>
              <div className="font-display text-2xl sm:text-3xl mt-3 tabular-nums">
                {p.price_cents === 0 ? "Gratis" : p.price.replace(" MXN", "")}
              </div>
              {p.price_cents > 0 && <div className="text-xs text-ink-muted">MXN / mes</div>}

              <ul className="space-y-1.5 mt-4 mb-5 text-sm">
                {Object.entries(ALL_FEATURES).map(([code, label]) => {
                  const has = p.features.includes(code);
                  return (
                    <li key={code} className={cn("flex items-start gap-2", has ? "text-text" : "text-ink-muted")}>
                      {has ? <Check size={14} className="text-accent mt-0.5 shrink-0" /> : <Lock size={12} className="mt-0.5 shrink-0" />}
                      <span className={!has ? "line-through opacity-60" : undefined}>{label}</span>
                    </li>
                  );
                })}
              </ul>

              {isCurrent ? (
                <div className="mt-auto w-full py-2.5 text-center text-sm font-medium text-ink-muted bg-bg-vellum rounded-full">
                  Plan actual
                </div>
              ) : (
                <Link
                  href="/precios"
                  className="mt-auto btn btn-accent w-full justify-center text-sm"
                >
                  Cambiar plan
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

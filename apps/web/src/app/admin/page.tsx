import { Calendar, TrendingUp, DollarSign, Users, UserMinus, Sparkles, ArrowRight, Clock } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { getDashboard } from "@/lib/admin-api";
import { Card, CardSubtitle, CardTitle, CardEyebrow } from "@/components/ui/Card";
import { WhatsAppBanner } from "@/components/admin/WhatsAppBanner";
import { fmtCents } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PLAN_LABEL: Record<string, string> = {
  free: "Gratis",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default async function AdminDashboardPage() {
  let data;
  let error: string | null = null;
  try {
    data = await getDashboard();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error";
  }

  if (error || !data) {
    return (
      <div className="card-paper p-10 text-center">
        <div className="text-danger font-display text-2xl mb-2 font-bold">No pudimos cargar tu información.</div>
        <div className="text-sm text-ink-2">
          Vuelve a intentarlo en unos segundos. Si el problema sigue, escríbenos.
        </div>
      </div>
    );
  }

  const k = data.kpis;
  const planLabel = PLAN_LABEL[data.tenant.plan ?? "starter"] ?? data.tenant.plan;
  const cloudEnabled = (data as { whatsapp_driver?: string }).whatsapp_driver === "cloud";

  const isTrialing = data.tenant.plan_status === "trialing";
  let trialDaysLeft = 0;
  if (isTrialing && data.tenant.trial_ends_at) {
    const endsAt = new Date(data.tenant.trial_ends_at);
    const diff = endsAt.getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="space-y-8 sm:space-y-12">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-accent-3 mb-3">Buen día</div>
        <h1 className="font-display text-3xl sm:text-5xl text-ink leading-tight font-bold tracking-tight">
          {data.tenant.name}
        </h1>
        <p className="text-ink-2 text-sm mt-3">
          Plan <span className="font-semibold text-primary">{planLabel}</span> · {data.features.length} funciones activas
        </p>
      </header>

      <WhatsAppBanner cloudEnabled={cloudEnabled} />

      {isTrialing && (
        <div className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl border border-amber-300/60 bg-amber-50/80">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
            <Clock size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">Período de prueba</div>
            <div className="font-display font-bold text-lg text-amber-900 leading-tight">
              {trialDaysLeft > 0 ? `${trialDaysLeft} día${trialDaysLeft !== 1 ? "s" : ""} restantes` : "Tu prueba ha vencido"}
            </div>
            <div className="mt-2 h-1.5 bg-amber-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all"
                style={{ width: `${Math.round(((15 - trialDaysLeft) / 15) * 100)}%` }}
              />
            </div>
            <div className="text-xs text-amber-700 mt-1.5">{15 - trialDaysLeft} de 15 días usados</div>
          </div>
          <Link href="/admin/billing" className="btn btn-primary text-sm shrink-0">
            Activar plan
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Citas hoy"        value={k.today_appointments}                  icon={<Calendar size={18} />} accent />
        <StatCard label="Citas este mes"   value={k.month_appointments}                  icon={<TrendingUp size={18} />} />
        <StatCard label="Ingresos del mes" value={fmtCents(k.month_revenue_cents)}       icon={<DollarSign size={18} />} accent />
        <StatCard label="Clientes"          value={k.total_clients}                       icon={<Users size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2">
          <CardEyebrow>Próximas citas</CardEyebrow>
          <CardTitle>Tu agenda</CardTitle>
          <CardSubtitle>Echa un vistazo rápido o entra a Agenda para verlo todo.</CardSubtitle>
          <Link href="/admin/agenda" className="btn btn-primary mt-6 sm:mt-7 inline-flex items-center gap-2">
            Ir a Agenda <ArrowRight size={14} />
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-bg-vellum to-bg-paper">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <UserMinus size={18} />
            </div>
            <div>
              <CardEyebrow className="mb-1">Recupera clientes</CardEyebrow>
              <CardSubtitle>Llevan más de 30 días sin venir</CardSubtitle>
            </div>
          </div>
          <div className="font-display text-5xl sm:text-6xl tabular-nums text-cb-grad leading-none font-bold">
            {k.inactive_clients_30d}
          </div>
          <p className="text-sm text-ink-2 mt-3 mb-5 leading-relaxed">
            Mándales un WhatsApp con un cupón. Toma un clic.
          </p>
          <Link href="/admin/marketing" className="btn btn-ghost text-sm inline-flex items-center gap-2">
            <Sparkles size={14} /> Crear campaña
          </Link>
        </Card>
      </div>
    </div>
  );
}

import { Calendar, TrendingUp, DollarSign, Users, UserMinus, Sparkles, ArrowRight } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { getDashboard } from "@/lib/admin-api";
import { Card, CardSubtitle, CardTitle, CardEyebrow } from "@/components/ui/Card";
import { fmtCents } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
        <div className="text-danger font-display italic text-2xl mb-2">No se pudo conectar con el API.</div>
        <div className="text-sm text-ink-2">
          Asegúrate de que <code className="font-mono text-primary">php artisan serve</code> esté corriendo en :8000.
        </div>
      </div>
    );
  }

  const k = data.kpis;

  return (
    <div className="space-y-8 sm:space-y-12">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Buen día</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">{data.tenant.name}</h1>
        <p className="text-ink-2 text-sm mt-3">
          Plan actual: <span className="font-display italic text-primary">{data.tenant.plan}</span> · {data.features.length} funciones activas
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Citas hoy"      value={k.today_appointments}      icon={<Calendar size={18} />} accent />
        <StatCard label="Citas este mes" value={k.month_appointments}      icon={<TrendingUp size={18} />} />
        <StatCard label="Ingresos mes"   value={fmtCents(k.month_revenue_cents)} icon={<DollarSign size={18} />} accent />
        <StatCard label="Clientes total" value={k.total_clients}            icon={<Users size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2">
          <CardEyebrow>Próximas citas</CardEyebrow>
          <CardTitle>Tu agenda</CardTitle>
          <CardSubtitle>Vista rápida. Para gestión completa entra a Agenda.</CardSubtitle>
          <Link href="/admin/agenda" className="btn btn-primary mt-6 sm:mt-7 inline-flex items-center gap-2">
            Ir a Agenda <ArrowRight size={14} />
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-bg-vellum to-bg-paper">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-[10px] bg-primary/10 text-primary border border-primary/20">
              <UserMinus size={18} />
            </div>
            <div>
              <CardEyebrow className="mb-1">Retención</CardEyebrow>
              <CardSubtitle>Clientes inactivos +30 días</CardSubtitle>
            </div>
          </div>
          <div className="font-display italic text-5xl sm:text-6xl tabular-nums text-primary leading-none">{k.inactive_clients_30d}</div>
          <p className="text-sm text-ink-2 mt-3 mb-5 leading-relaxed">
            Reactiva con un WhatsApp + cupón único en un clic.
          </p>
          <Link href="/admin/marketing" className="btn btn-ghost text-sm inline-flex items-center gap-2">
            <Sparkles size={14} /> Abrir Marketing
          </Link>
        </Card>
      </div>
    </div>
  );
}

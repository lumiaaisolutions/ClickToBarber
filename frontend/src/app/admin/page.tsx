import { Calendar, TrendingUp, DollarSign, Users, UserMinus, Sparkles } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { getDashboard } from "@/lib/admin-api";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
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
      <div className="card-premium p-10 text-center">
        <div className="text-danger font-medium mb-2">No se pudo conectar con el API.</div>
        <div className="text-sm text-text-2">Asegúrate de que <code className="font-mono text-accent">php artisan serve</code> esté corriendo en :8000.</div>
      </div>
    );
  }

  const k = data.kpis;

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">Buen día</div>
        <h1 className="font-display text-4xl">{data.tenant.name}</h1>
        <p className="text-text-2 text-sm mt-1">
          Plan actual: <span className="text-accent-2 font-medium uppercase">{data.tenant.plan}</span> · {data.features.length} funciones activas
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Citas hoy"      value={k.today_appointments}      icon={<Calendar size={18} />} accent />
        <StatCard label="Citas este mes" value={k.month_appointments}      icon={<TrendingUp size={18} />} />
        <StatCard label="Ingresos mes"   value={fmtCents(k.month_revenue_cents)} icon={<DollarSign size={18} />} accent />
        <StatCard label="Clientes total" value={k.total_clients}            icon={<Users size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardTitle>Próximas citas</CardTitle>
          <CardSubtitle>Vista rápida. Para gestión completa entra a Agenda.</CardSubtitle>
          <div className="mt-6">
            <Link href="/admin/agenda" className="btn-gold inline-flex px-5 py-2.5 rounded-full text-sm font-medium">
              Ir a Agenda →
            </Link>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-bordeaux/20 to-bg-base">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-accent/15 text-accent"><UserMinus size={18} /></div>
            <div>
              <CardTitle>Retención</CardTitle>
              <CardSubtitle>Clientes inactivos +30 días</CardSubtitle>
            </div>
          </div>
          <div className="mt-4 font-display text-5xl tabular-nums text-accent-2">{k.inactive_clients_30d}</div>
          <p className="text-sm text-text-2 mt-2 mb-4">
            Reactiva con un WhatsApp + cupón único.
          </p>
          <Link href="/admin/marketing" className="btn-ghost inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs">
            <Sparkles size={14} /> Abrir Marketing
          </Link>
        </Card>
      </div>
    </div>
  );
}

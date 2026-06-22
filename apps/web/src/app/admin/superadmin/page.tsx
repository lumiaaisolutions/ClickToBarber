import { api } from "@/lib/api";
import { Building2, Users, Clock, TrendingUp, ArrowRight } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardTitle, CardEyebrow } from "@/components/ui/Card";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PlatformStats {
  total: number;
  trialing: number;
  active: number;
  inactive: number;
  recent: Array<{
    id: string; name: string; slug: string; owner_email: string;
    plan_code: string | null; plan_status: string | null;
    pago_externo: boolean | null; trial_days_left: number | null;
    created_at: string;
  }>;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Activo", trialing: "Prueba", incomplete: "Inactivo",
  past_due: "Vencido", canceled: "Cancelado",
};
const STATUS_COLOR: Record<string, string> = {
  active: "text-success bg-success/10",
  trialing: "text-amber-700 bg-amber-100",
  incomplete: "text-danger bg-danger/10",
  past_due: "text-warning bg-warning/10",
  canceled: "text-ink-muted bg-bg-vellum",
};

export default async function SuperAdminPage() {
  let stats: PlatformStats | null = null;
  try {
    stats = await api<PlatformStats>("/admin/superadmin/stats", { authed: true });
  } catch {}

  if (!stats) {
    return (
      <div className="card-paper p-10 text-center">
        <div className="text-danger font-display text-2xl font-bold mb-2">Sin acceso o error al cargar.</div>
        <div className="text-sm text-ink-2">Verifica que tu cuenta tiene rol platform_owner.</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-3">LUMIA Platform</div>
        <h1 className="font-display font-bold tracking-tight text-3xl sm:text-4xl text-ink">Panel de control</h1>
        <p className="text-ink-2 text-sm mt-2">Visión global de todos los negocios en la plataforma.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total negocios" value={stats.total}    icon={<Building2 size={18} />} />
        <StatCard label="Activos"        value={stats.active}   icon={<TrendingUp size={18} />} accent />
        <StatCard label="En prueba"      value={stats.trialing} icon={<Clock size={18} />} />
        <StatCard label="Inactivos"      value={stats.inactive} icon={<Users size={18} />} />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-5">
          <div>
            <CardEyebrow>Actividad reciente</CardEyebrow>
            <CardTitle>Últimos registros</CardTitle>
          </div>
          <Link href="/admin/superadmin/tenants" className="btn btn-ghost text-sm inline-flex items-center gap-1.5">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto -mx-1">
          <table className="table-clean w-full">
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Registro</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((t) => {
                const status = t.pago_externo ? "active" : (t.plan_status ?? "incomplete");
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="font-semibold text-ink text-sm">{t.name}</div>
                      <div className="text-xs text-ink-muted">{t.owner_email}</div>
                    </td>
                    <td>
                      <span className="text-xs font-semibold uppercase text-ink-2">{t.plan_code ?? "—"}</span>
                    </td>
                    <td>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[status] ?? STATUS_COLOR.incomplete}`}>
                        {t.pago_externo ? "Manual" : (STATUS_LABEL[status] ?? status)}
                      </span>
                    </td>
                    <td className="text-xs text-ink-muted">
                      {new Date(t.created_at).toLocaleDateString("es-MX")}
                    </td>
                    <td>
                      <Link href={`/admin/superadmin/tenants/${t.id}`} className="text-xs text-primary hover:underline">
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

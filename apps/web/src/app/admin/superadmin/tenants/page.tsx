import { api } from "@/lib/api";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardTitle, CardEyebrow } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

interface TenantRow {
  id: string; name: string; slug: string; owner_email: string;
  plan_code: string | null; plan_status: string | null;
  pago_externo: boolean | null; trial_days_left: number | null;
  barbers_count: number | null; created_at: string;
}

interface PagedResponse { data: TenantRow[]; meta: { total: number; last_page: number; current_page: number } }

const STATUS_COLOR: Record<string, string> = {
  active:     "text-success bg-success/10",
  trialing:   "text-amber-700 bg-amber-100",
  incomplete: "text-danger bg-danger/10",
  past_due:   "text-warning bg-warning/10",
  canceled:   "text-ink-muted bg-bg-vellum",
};

export default async function TenantsListPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.page)   qs.set("page",   params.page);

  let result: PagedResponse | null = null;
  try {
    result = await api<PagedResponse>(`/admin/superadmin/tenants?${qs.toString()}`, { authed: true });
  } catch {}

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-2">LUMIA Platform</div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink tracking-tight">Todos los negocios</h1>
        {result && <p className="text-ink-2 text-sm mt-2">{result.meta.total} negocios registrados</p>}
      </header>

      {/* Filtros */}
      <form method="GET" className="flex flex-wrap gap-2">
        <input
          name="search"
          defaultValue={params.search ?? ""}
          placeholder="Buscar por nombre, slug o email…"
          className="input-field max-w-xs text-sm py-2"
        />
        <select name="status" defaultValue={params.status ?? ""} className="input-field max-w-[160px] text-sm py-2">
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="trialing">En prueba</option>
          <option value="incomplete">Inactivo</option>
          <option value="past_due">Vencido</option>
        </select>
        <button type="submit" className="btn btn-primary text-sm">Filtrar</button>
      </form>

      <Card>
        <CardEyebrow>Negocios</CardEyebrow>
        <CardTitle className="mb-5">Lista completa</CardTitle>

        <div className="overflow-x-auto -mx-1">
          <table className="table-clean">
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Pago ext.</th>
                <th>Barberos</th>
                <th>Registro</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {result?.data.map((t) => {
                const statusKey = t.pago_externo ? "active" : (t.plan_status ?? "incomplete");
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="font-semibold text-sm text-ink">{t.name}</div>
                      <div className="text-xs text-ink-muted">{t.slug} · {t.owner_email}</div>
                    </td>
                    <td><span className="text-xs font-semibold uppercase">{t.plan_code ?? "—"}</span></td>
                    <td>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[statusKey] ?? STATUS_COLOR.incomplete}`}>
                        {t.plan_status ?? "—"}
                        {t.trial_days_left !== null && t.plan_status === "trialing" && ` (${t.trial_days_left}d)`}
                      </span>
                    </td>
                    <td>
                      {t.pago_externo
                        ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Manual</span>
                        : <span className="text-xs text-ink-muted">Stripe</span>}
                    </td>
                    <td className="text-sm text-ink-2">{t.barbers_count ?? "—"}</td>
                    <td className="text-xs text-ink-muted">{new Date(t.created_at).toLocaleDateString("es-MX")}</td>
                    <td>
                      <Link href={`/admin/superadmin/tenants/${t.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        Editar <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              }) ?? (
                <tr><td colSpan={7} className="text-center text-ink-muted py-10">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {result && result.meta.last_page > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-line-fine mt-4">
            <span className="text-xs text-ink-muted">
              Página {result.meta.current_page} de {result.meta.last_page}
            </span>
            <div className="flex gap-2">
              {result.meta.current_page > 1 && (
                <Link href={`?page=${result.meta.current_page - 1}`} className="btn btn-ghost text-xs">
                  Anterior
                </Link>
              )}
              {result.meta.current_page < result.meta.last_page && (
                <Link href={`?page=${result.meta.current_page + 1}`} className="btn btn-primary text-xs">
                  Siguiente
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

import { api } from "@/lib/api";
import Link from "next/link";
import { Card, CardTitle, CardEyebrow } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

interface UserRow {
  id: number; name: string; email: string; role: string;
  tenant_id: string | null; created_at: string;
}
interface PagedResponse { data: UserRow[]; meta: { total: number; last_page: number; current_page: number } }

const ROLE_COLOR: Record<string, string> = {
  platform_owner: "bg-primary text-bg-canvas",
  admin:          "bg-primary/10 text-primary",
  manager:        "bg-accent/10 text-accent-3",
  receptionist:   "bg-bg-vellum text-ink-2",
  barber:         "bg-success/10 text-success",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.page)   qs.set("page",   params.page);

  let result: PagedResponse | null = null;
  try {
    result = await api<PagedResponse>(`/admin/superadmin/users?${qs.toString()}`, { authed: true });
  } catch {}

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-2">LUMIA Platform</div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink tracking-tight">Usuarios globales</h1>
        {result && <p className="text-ink-2 text-sm mt-2">{result.meta.total} usuarios en la plataforma</p>}
      </header>

      <form method="GET" className="flex flex-wrap gap-2">
        <input
          name="search"
          defaultValue={params.search ?? ""}
          placeholder="Buscar por nombre o email…"
          className="input-field max-w-xs text-sm py-2"
        />
        <button type="submit" className="btn btn-primary text-sm">Buscar</button>
      </form>

      <Card>
        <CardEyebrow>Usuarios</CardEyebrow>
        <CardTitle className="mb-5">Todos los portales</CardTitle>

        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Tenant ID</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {result?.data.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold text-sm text-ink">{u.name}</td>
                  <td className="text-sm text-ink-2">{u.email}</td>
                  <td>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLOR[u.role] ?? ROLE_COLOR.barber}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="text-xs text-ink-muted font-mono">
                    {u.tenant_id
                      ? <Link href={`/admin/superadmin/tenants/${u.tenant_id}`} className="text-primary hover:underline">{u.tenant_id.slice(0, 8)}…</Link>
                      : "—"}
                  </td>
                  <td className="text-xs text-ink-muted">{new Date(u.created_at).toLocaleDateString("es-MX")}</td>
                </tr>
              )) ?? (
                <tr><td colSpan={5} className="text-center text-ink-muted py-10">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {result && result.meta.last_page > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-line-fine mt-4">
            <span className="text-xs text-ink-muted">Página {result.meta.current_page} de {result.meta.last_page}</span>
            <div className="flex gap-2">
              {result.meta.current_page > 1 && (
                <Link href={`?page=${result.meta.current_page - 1}`} className="btn btn-ghost text-xs">Anterior</Link>
              )}
              {result.meta.current_page < result.meta.last_page && (
                <Link href={`?page=${result.meta.current_page + 1}`} className="btn btn-primary text-xs">Siguiente</Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

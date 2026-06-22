import { api } from "@/lib/api";
import { TenantEditClient } from "@/components/admin/TenantEditClient";

export const dynamic = "force-dynamic";

interface Plan { id: number; code: string; name: string; price_cents: number }
interface TenantDetail {
  id: string; name: string; slug: string; owner_email: string;
  plan_id: number | null; plan_code: string | null; plan_name: string | null;
  plan_status: string | null; pago_externo: boolean | null;
  trial_ends_at: string | null; trial_days_left: number | null;
  timezone: string | null; phone: string | null; address: string | null;
  created_at: string; updated_at: string;
}
interface User { id: number; name: string; email: string; role: string; created_at: string }

export default async function TenantEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let tenant: TenantDetail | null = null;
  let users: User[] = [];
  let availablePlans: Plan[] = [];
  let error: string | null = null;

  try {
    const res = await api<{ tenant: TenantDetail; users: User[]; available_plans: Plan[] }>(
      `/admin/superadmin/tenants/${id}`,
      { authed: true },
    );
    tenant = res.tenant;
    users  = res.users;
    availablePlans = res.available_plans;
  } catch (e) {
    error = e instanceof Error ? e.message : "Error";
  }

  if (error || !tenant) {
    return (
      <div className="card-paper p-10 text-center">
        <div className="text-danger font-display text-2xl font-bold mb-2">No se pudo cargar el negocio.</div>
        <div className="text-sm text-ink-2">{error}</div>
      </div>
    );
  }

  return (
    <TenantEditClient
      tenant={tenant}
      users={users}
      availablePlans={availablePlans}
    />
  );
}

import { api } from "@/lib/api";
import { MembershipsClient } from "@/components/admin/MembershipsClient";

export const dynamic = "force-dynamic";

interface Plan {
  id: number; name: string; price_cents: number; currency: string;
  included_services_per_month: number; eligible_service_ids: number[] | null;
  is_active: boolean;
}

export default async function MembershipsPage() {
  const data = await api<{ plans: Plan[]; kpis: { active_subscribers: number } }>(
    "/admin/memberships", { authed: true },
  ).catch(() => ({ plans: [] as Plan[], kpis: { active_subscribers: 0 } }));
  return <MembershipsClient initial={data} />;
}

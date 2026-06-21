import { getServicesAdmin } from "@/lib/admin-api";
import { API_BASE, serverAuthHeader } from "@/lib/auth";
import { ServicesClient } from "@/components/admin/ServicesClient";

export const dynamic = "force-dynamic";

interface MeResponse {
  user: { can_write: boolean };
}

export default async function ServicesPage() {
  const [services, meRes] = await Promise.all([
    getServicesAdmin().catch(() => []),
    fetch(`${API_BASE}/auth/me`, { headers: { Accept: "application/json", ...(await serverAuthHeader()) }, cache: "no-store" }),
  ]);
  const me = meRes.ok ? ((await meRes.json()) as MeResponse) : null;

  return <ServicesClient initial={services} canWrite={me?.user.can_write ?? false} />;
}

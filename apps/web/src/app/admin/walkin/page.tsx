import { api } from "@/lib/api";
import { WalkInAdminClient } from "@/components/admin/WalkInAdminClient";

export const dynamic = "force-dynamic";

interface Entry {
  id: number;
  client_name: string;
  client_phone: string | null;
  barber_id: number | null;
  service_id: number | null;
  status: "waiting" | "in_progress" | "served" | "abandoned";
  arrived_at: string | null;
  called_at: string | null;
  served_at: string | null;
}

export default async function WalkInPage() {
  const entries = await api<Entry[]>("/admin/queue", { authed: true }).catch(() => [] as Entry[]);
  return <WalkInAdminClient initial={entries} />;
}

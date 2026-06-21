import { api } from "@/lib/api";
import { ClientTimelineClient } from "@/components/admin/ClientTimelineClient";

export const dynamic = "force-dynamic";

interface Timeline {
  client: { id: number; name: string; email: string; phone: string | null };
  stats: {
    total_visits: number;
    total_spent_cents: number;
    first_visit: string | null;
    last_visit: string | null;
    favorite_barber: number | null;
    visits_credited: number;
  };
  appointments: Array<{
    id: number; starts_at: string; status: string;
    service: string | null; barber: string | null; price_cents: number;
  }>;
  rewards: Array<{ code: string; reward_type: string; reward_value: number; issued_at: string; redeemed_at: string | null; expires_at: string | null }>;
  ratings: Array<{ stars: number; comment: string | null; submitted_at: string }>;
}

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await api<Timeline>(`/admin/clients/${id}/timeline`, { authed: true });
    return <ClientTimelineClient initial={data} />;
  } catch {
    return <div className="text-ink-2">Cliente no encontrado.</div>;
  }
}

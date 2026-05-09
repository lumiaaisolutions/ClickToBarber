import { api } from "@/lib/api";
import { RatingsAdminClient } from "@/components/admin/RatingsAdminClient";

export const dynamic = "force-dynamic";

interface Rating {
  id: number; stars: number; comment: string | null; is_published: boolean;
  client: string | null; barber: string | null; submitted_at: string | null;
}

export default async function RatingsAdminPage() {
  const data = await api<{ stats: { avg: number | null; count: number; positive: number; negative: number }; ratings: Rating[] }>(
    "/admin/ratings", { authed: true },
  ).catch(() => ({ stats: { avg: null, count: 0, positive: 0, negative: 0 }, ratings: [] as Rating[] }));
  return <RatingsAdminClient initial={data} />;
}

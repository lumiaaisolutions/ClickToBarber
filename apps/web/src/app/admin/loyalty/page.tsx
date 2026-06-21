import { api } from "@/lib/api";
import { LoyaltyClient } from "@/components/admin/LoyaltyClient";

export const dynamic = "force-dynamic";

interface LoyaltyResponse {
  program: {
    is_active: boolean;
    every_n_visits: number;
    reward_type: "discount_pct" | "free_service";
    reward_value: number;
    reward_label: string | null;
    expiry_days: number;
  };
  kpis: {
    rewards_active: number;
    rewards_redeemed: number;
    visits_credited: number;
  };
}

interface Reward {
  id: number;
  code: string;
  reward_type: string;
  reward_value: number;
  reward_label: string | null;
  user: { id: number; name: string; email: string } | null;
  issued_at: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
  usable: boolean;
}

export default async function LoyaltyPage() {
  const [data, rewards] = await Promise.all([
    api<LoyaltyResponse>("/admin/loyalty", { authed: true }).catch(() => null),
    api<Reward[]>("/admin/loyalty/rewards", { authed: true }).catch(() => [] as Reward[]),
  ]);

  if (!data) {
    return <div className="text-ink-2">Error cargando programa de loyalty.</div>;
  }

  return <LoyaltyClient initial={data} rewards={rewards ?? []} />;
}

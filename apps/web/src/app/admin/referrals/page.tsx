import { api } from "@/lib/api";
import { ReferralsClient } from "@/components/admin/ReferralsClient";

export const dynamic = "force-dynamic";

interface Referral {
  id: number;
  code: string;
  status: "pending" | "signed_up" | "completed" | "expired";
  referrer: { id: number; name: string; email: string } | null;
  referred_email: string | null;
  referred: { id: number; name: string } | null;
  reward_referrer: number;
  reward_referred: number;
  expires_at: string | null;
  created_at: string | null;
}

export default async function ReferralsPage() {
  const data = await api<{
    kpis: { pending: number; signed_up: number; completed: number };
    referrals: Referral[];
  }>("/admin/referrals", { authed: true }).catch(() => ({
    kpis: { pending: 0, signed_up: 0, completed: 0 },
    referrals: [] as Referral[],
  }));

  return <ReferralsClient initial={data} />;
}

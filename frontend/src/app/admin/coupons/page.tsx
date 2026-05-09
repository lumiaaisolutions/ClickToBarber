import { api } from "@/lib/api";
import { CouponsClient } from "@/components/admin/CouponsClient";

export const dynamic = "force-dynamic";

interface Coupon {
  id: number;
  code: string;
  discount_pct: number | null;
  discount_cents: number | null;
  expires_at: string | null;
  redeemed_at: string | null;
}

export default async function CouponsPage() {
  const coupons = await api<Coupon[]>("/admin/coupons", { authed: true }).catch(() => [] as Coupon[]);
  return <CouponsClient initial={coupons} />;
}

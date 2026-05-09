import { api } from "@/lib/api";
import { GiftCardsClient } from "@/components/admin/GiftCardsClient";

export const dynamic = "force-dynamic";

interface GiftCard {
  id: number; code: string; value_cents: number; balance_cents: number; currency: string;
  recipient_email: string | null; recipient_name: string | null;
  redeemed_at: string | null; expires_at: string | null;
}

export default async function GiftCardsPage() {
  const cards = await api<GiftCard[]>("/admin/giftcards", { authed: true }).catch(() => [] as GiftCard[]);
  return <GiftCardsClient initial={cards} />;
}

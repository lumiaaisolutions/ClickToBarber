import { ClientPortalClient } from "@/components/client/ClientPortalClient";

interface SP { searchParams: Promise<{ token?: string; slug?: string; membership?: string }>; }

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi cuenta — LUMIA" };

export default async function MePage({ searchParams }: SP) {
  const sp = await searchParams;
  const flash = sp.membership === "success" ? "success"
    : sp.membership === "cancelled" ? "cancelled" : null;
  return <ClientPortalClient initialToken={sp.token ?? null} initialSlug={sp.slug ?? null} membershipFlash={flash} />;
}

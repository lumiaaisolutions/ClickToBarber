import { api } from "@/lib/api";
import { CalendarSyncClient } from "@/components/admin/CalendarSyncClient";

export const dynamic = "force-dynamic";

interface Status {
  configured: boolean;
  connected: boolean;
  account: string | null;
  last_synced_at: string | null;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const status = await api<Status>("/admin/calendar", { authed: true }).catch(() => ({
    configured: false,
    connected: false,
    account: null,
    last_synced_at: null,
  }));

  return (
    <CalendarSyncClient
      initial={status}
      flash={{ connected: sp.connected === "1", error: sp.error ?? null }}
    />
  );
}

import { api } from "@/lib/api";
import { AuditLogClient } from "@/components/admin/AuditLogClient";

export const dynamic = "force-dynamic";

interface AuditEntry {
  id: number;
  action: string;
  subject: { type: string; id: string };
  actor: string | null;
  changes: Record<string, unknown> | null;
  ip: string | null;
  request_id: string | null;
  created_at: string | null;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.action ? `?action=${encodeURIComponent(sp.action)}` : "";
  const data = await api<{ count: number; logs: AuditEntry[] }>(
    `/admin/audit${filter}`,
    { authed: true },
  ).catch(() => ({ count: 0, logs: [] as AuditEntry[] }));

  return <AuditLogClient initial={data} activeFilter={sp.action ?? null} />;
}

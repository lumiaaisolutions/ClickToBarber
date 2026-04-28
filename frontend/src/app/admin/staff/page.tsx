import { getStaff } from "@/lib/admin-api";
import { API_BASE, serverAuthHeader } from "@/lib/auth";
import { StaffClient } from "@/components/admin/StaffClient";

export const dynamic = "force-dynamic";

interface MeResponse {
  user: { role: string; email: string; can_write: boolean };
}

export default async function StaffPage() {
  const [staff, meRes] = await Promise.all([
    getStaff().catch(() => []),
    fetch(`${API_BASE}/auth/me`, { headers: { Accept: "application/json", ...(await serverAuthHeader()) }, cache: "no-store" }),
  ]);

  const me = meRes.ok ? ((await meRes.json()) as MeResponse) : null;

  return (
    <StaffClient
      initial={staff}
      role={me?.user.role ?? "barber"}
      email={me?.user.email ?? ""}
      canWrite={me?.user.can_write ?? false}
    />
  );
}

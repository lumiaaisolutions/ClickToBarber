import { api } from "@/lib/api";
import { SecurityPolicyClient } from "@/components/admin/SecurityPolicyClient";

export const dynamic = "force-dynamic";

interface Policy {
  require_2fa: boolean;
  session_idle_minutes: number;
  password_policy: "basic" | "strong";
}

export default async function SecurityPolicyPage() {
  const policy = await api<Policy>("/admin/security/policy", { authed: true }).catch(() => ({
    require_2fa: false, session_idle_minutes: 120, password_policy: "strong" as const,
  }));
  return <SecurityPolicyClient initial={policy} />;
}

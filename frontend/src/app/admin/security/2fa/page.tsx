import { TwoFactorClient } from "@/components/admin/TwoFactorClient";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

interface Status {
  enabled: boolean;
  pending_confirmation: boolean;
  confirmed_at: string | null;
}

export default async function TwoFactorPage() {
  const status = await api<Status>("/admin/security/2fa", { authed: true }).catch(
    () => ({ enabled: false, pending_confirmation: false, confirmed_at: null }),
  );

  return <TwoFactorClient initial={status} />;
}

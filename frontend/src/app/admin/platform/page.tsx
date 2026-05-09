import { api } from "@/lib/api";
import { PlatformClient } from "@/components/admin/PlatformClient";

export const dynamic = "force-dynamic";

interface ApiKey { id: number; name: string; prefix: string; scopes: string[]; last_used_at: string | null; expires_at: string | null; revoked_at: string | null; }
interface Webhook { id: number; url: string; events: string[]; is_active: boolean; consecutive_failures: number; last_success_at: string | null; last_failure_at: string | null; }

export default async function PlatformPage() {
  const [keys, webhooks] = await Promise.all([
    api<ApiKey[]>("/admin/platform/keys", { authed: true }).catch(() => [] as ApiKey[]),
    api<Webhook[]>("/admin/platform/webhooks", { authed: true }).catch(() => [] as Webhook[]),
  ]);
  return <PlatformClient keys={keys} webhooks={webhooks} />;
}

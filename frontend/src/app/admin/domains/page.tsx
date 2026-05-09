import { api } from "@/lib/api";
import { DomainsClient } from "@/components/admin/DomainsClient";

export const dynamic = "force-dynamic";

interface Domain {
  id: number;
  host: string;
  verification: { record_name: string; record_type: string; record_value: string };
  verified_at: string | null;
  is_primary: boolean;
  created_at: string | null;
}

export default async function DomainsPage() {
  const domains = await api<Domain[]>("/admin/domains", { authed: true }).catch(
    () => [] as Domain[],
  );

  return <DomainsClient initial={domains} />;
}

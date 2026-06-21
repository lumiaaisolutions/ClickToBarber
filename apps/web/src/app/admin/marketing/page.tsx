import { getDashboard, getInactive } from "@/lib/admin-api";
import { FeatureGate } from "@/components/FeatureGate";
import { MarketingClient } from "@/components/admin/MarketingClient";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const dash = await getDashboard().catch(() => null);
  const enabled = dash?.features.includes("marketing_retention") ?? false;

  let data: Awaited<ReturnType<typeof getInactive>> | null = null;
  if (enabled) {
    try { data = await getInactive(); } catch {}
  } else {
    data = MOCK_INACTIVE;
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">Marketing</div>
        <h1 className="font-display text-4xl">Retención de clientes</h1>
        <p className="text-ink-2 text-sm mt-1">
          Detecta clientes que llevan tiempo sin volver y dispara una campaña en un clic.
        </p>
      </header>

      <FeatureGate
        feature="marketing_retention"
        enabled={enabled}
        requiredPlan="Pro"
        upgradeHref="/admin/billing"
      >
        <MarketingClient initialData={data!} />
      </FeatureGate>
    </div>
  );
}

const MOCK_INACTIVE = {
  days_threshold: 30,
  count: 16,
  clients: Array.from({ length: 16 }, (_, i) => ({
    id: i + 1,
    name: `Cliente Demo ${i + 1}`,
    email: `cliente${i + 1}@elnavajazo.test`,
    phone: `+5215500010${String(i + 1).padStart(3, "0")}`,
    last_visit: i % 3 === 0 ? null : new Date(Date.now() - (40 + i * 5) * 86400000).toISOString(),
    days_since: i % 3 === 0 ? null : 40 + i * 5,
  })),
};

import { getDashboard, getFinance } from "@/lib/admin-api";
import { FeatureGate } from "@/components/FeatureGate";
import { fmtCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const dash = await getDashboard().catch(() => null);
  const enabled = dash?.features.includes("finance_reports") ?? false;

  let data: Awaited<ReturnType<typeof getFinance>> | null = null;
  if (enabled) {
    try { data = await getFinance(); } catch {}
  } else {
    data = MOCK_FINANCE;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">Finanzas</div>
        <h1 className="font-display text-3xl sm:text-4xl">Reporte mensual</h1>
        <p className="text-ink-2 text-sm mt-1">Ingresos por canal, propósito y comisiones por barbero.</p>
      </header>

      <FeatureGate
        feature="finance_reports"
        enabled={enabled}
        requiredPlan="Enterprise"
        upgradeHref="/admin/billing"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          <div className="card-paper p-5 sm:p-6 bg-gradient-to-br from-accent/15 to-bg-base">
            <div className="text-xs text-ink-muted uppercase tracking-wider">Ingreso bruto</div>
            <div className="font-display text-3xl sm:text-5xl text-accent-2 tabular-nums mt-2 break-words">{fmtCents(data!.gross_cents)}</div>
            <div className="text-xs text-ink-2 mt-2">
              {data!.period.from.slice(0, 10)} → {data!.period.to.slice(0, 10)}
            </div>
          </div>

          <div className="card-paper p-5 sm:p-6">
            <div className="text-xs text-ink-muted uppercase tracking-wider mb-3">Por propósito</div>
            <ul className="space-y-2 text-sm">
              {Object.entries(data!.by_purpose).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3">
                  <span className="capitalize">{k}</span>
                  <span className="font-mono text-accent tabular-nums">{fmtCents(v as number)}</span>
                </li>
              ))}
              {Object.keys(data!.by_purpose).length === 0 && <li className="text-ink-muted text-xs">Sin datos</li>}
            </ul>
          </div>

          <div className="card-paper p-5 sm:p-6">
            <div className="text-xs text-ink-muted uppercase tracking-wider mb-3">Por proveedor</div>
            <ul className="space-y-2 text-sm">
              {Object.entries(data!.by_provider).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3">
                  <span className="capitalize">{k}</span>
                  <span className="font-mono text-accent tabular-nums">{fmtCents(v as number)}</span>
                </li>
              ))}
              {Object.keys(data!.by_provider).length === 0 && <li className="text-ink-muted text-xs">Sin datos</li>}
            </ul>
          </div>
        </div>

        <div className="card-paper p-5 sm:p-6 mt-4 sm:mt-5">
          <h2 className="font-display text-lg sm:text-xl mb-4">Comisiones por barbero</h2>
          {data!.commissions.length === 0 ? (
            <div className="text-ink-muted text-sm">Aún no hay tickets cerrados en este periodo.</div>
          ) : (
            <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
              <table className="w-full text-xs sm:text-sm min-w-[420px]">
                <thead className="text-ink-muted text-[10px] sm:text-xs uppercase tracking-wider">
                  <tr className="border-b border-line-fine">
                    <th className="text-left py-2">Barbero</th>
                    <th className="text-right py-2">Tickets</th>
                    <th className="text-right py-2">Bruto</th>
                    <th className="text-right py-2">Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.commissions.map((c, i) => (
                    <tr key={i} className="border-b border-line-fine/50">
                      <td className="py-3">{c.barber}</td>
                      <td className="py-3 text-right tabular-nums">{c.tickets}</td>
                      <td className="py-3 text-right font-mono tabular-nums">{fmtCents(c.gross_cents)}</td>
                      <td className="py-3 text-right font-mono text-accent tabular-nums">{fmtCents(c.commission_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FeatureGate>
    </div>
  );
}

const MOCK_FINANCE = {
  period: { from: new Date().toISOString(), to: new Date().toISOString() },
  gross_cents: 0,
  by_purpose:  { deposit: 0, service: 0 },
  by_provider: { stripe: 0, cash: 0 },
  commissions: [],
};

import { getStaff } from "@/lib/admin-api";
import { CashCloseClient } from "@/components/admin/CashCloseClient";

export const dynamic = "force-dynamic";

export default async function CashClosePage() {
  let barbers: Array<{ id: number; name: string; commission_pct: number }> = [];
  try {
    const list = await getStaff();
    barbers = list
      .filter((s) => s.is_active)
      .map((s) => ({ id: s.id, name: s.name, commission_pct: s.commission_pct }));
  } catch {}

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">Operación</div>
        <h1 className="font-display text-3xl sm:text-4xl">Cierre de caja</h1>
        <p className="text-ink-2 text-sm mt-1">
          Reconcilia ventas, propinas y efectivo declarado por barbero al cierre del turno.
        </p>
      </header>
      <CashCloseClient barbers={barbers} />
    </div>
  );
}

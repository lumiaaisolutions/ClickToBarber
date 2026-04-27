import { getAgenda } from "@/lib/admin-api";
import { AgendaView } from "@/components/admin/AgendaView";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const today = new Date();
  const start = new Date(today); start.setDate(today.getDate() - 1);
  const end   = new Date(today); end.setDate(today.getDate() + 7);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

  let appointments: Awaited<ReturnType<typeof getAgenda>>["data"] = [];
  try {
    const r = await getAgenda(fmt(start), fmt(end));
    appointments = r.data;
  } catch {}

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">Agenda</div>
        <h1 className="font-display text-4xl">Próximos 7 días</h1>
        <p className="text-text-2 text-sm mt-1">{appointments.length} citas en el rango.</p>
      </header>
      <AgendaView appointments={appointments} />
    </div>
  );
}

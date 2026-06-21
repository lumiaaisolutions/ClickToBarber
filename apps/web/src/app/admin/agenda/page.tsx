import { getAgenda, getStaff } from "@/lib/admin-api";
import { AgendaCalendar } from "@/components/admin/AgendaCalendar";

export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeekIso(d: Date): Date {
  // Lunes como inicio de semana (0=Dom, 1=Lun…). Si es Dom restamos 6, si no restamos (weekday-1).
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  const wd = c.getDay();
  const diff = wd === 0 ? -6 : 1 - wd;
  c.setDate(c.getDate() + diff);
  return c;
}

export default async function AgendaPage() {
  const today = new Date();
  const weekStart = startOfWeekIso(today);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  let appointments: Awaited<ReturnType<typeof getAgenda>>["data"] = [];
  try {
    const r = await getAgenda(fmtDate(weekStart), fmtDate(weekEnd));
    appointments = r.data;
  } catch {}

  let barbers: Array<{ id: number; name: string }> = [];
  try {
    const list = await getStaff();
    barbers = list.filter((s) => s.is_active).map((s) => ({ id: s.id, name: s.name }));
  } catch {}

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">Agenda</div>
        <h1 className="font-display text-3xl sm:text-4xl">Calendario</h1>
        <p className="text-ink-2 text-sm mt-1">
          Vista semanal con drag-and-drop para reagendar. {appointments.length} citas en la semana actual.
        </p>
      </header>
      <AgendaCalendar
        initialAppointments={appointments}
        initialWeekStart={fmtDate(weekStart)}
        barbers={barbers}
      />
    </div>
  );
}

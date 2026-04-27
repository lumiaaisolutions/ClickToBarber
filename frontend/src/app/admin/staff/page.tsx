import { getStaff } from "@/lib/admin-api";
import { Scissors, Mail, Phone } from "lucide-react";
import { WEEKDAYS_ES } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const staff = await getStaff();
  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">Staff</div>
        <h1 className="font-display text-4xl">Tus barberos</h1>
        <p className="text-text-2 text-sm mt-1">{staff.length} en activo. Cada uno con sus horarios y comisiones.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {staff.map((b) => (
          <div key={b.id} className="card-premium p-6">
            <div className="flex items-start gap-4">
              {b.avatar ? (
                <img src={b.avatar} alt={b.name} className="w-20 h-20 rounded-2xl object-cover ring-1 ring-border-strong" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-bg-overlay" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl">{b.name}</h2>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {b.specialties.map((s) => (
                        <span key={s} className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-bg-overlay border border-border-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-text-muted uppercase tracking-wider">Comisión</div>
                    <div className="font-display text-2xl text-accent">{b.commission_pct}%</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-2">
                  {b.email && <span className="inline-flex items-center gap-1"><Mail size={11} /> {b.email}</span>}
                  {b.phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {b.phone}</span>}
                  <span className="inline-flex items-center gap-1"><Scissors size={11} /> {b.services_count} servicios</span>
                </div>
              </div>
            </div>

            <hr className="divider-gold my-4" />

            <div>
              <div className="text-xs uppercase tracking-wider text-text-muted mb-2">Horario</div>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS_ES.map((d, i) => {
                  const shift = b.shifts.find((s) => s.weekday === i);
                  return (
                    <div key={d} className="text-center p-2 rounded-lg border border-border-medium text-[11px]">
                      <div className="font-medium text-text-muted">{d}</div>
                      <div className="font-mono text-text mt-1">{shift ? `${shift.start.slice(0,5)}` : "—"}</div>
                      <div className="font-mono text-text-2 text-[10px]">{shift ? shift.end.slice(0,5) : ""}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, User, Scissors } from "lucide-react";
import type { AppointmentDto } from "@/lib/api";
import { cn, fmtCents, fmtTime } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  confirmed:             "bg-success/15 text-success border-success/30",
  pending_confirmation:  "bg-warning/15 text-warning border-warning/30",
  in_progress:           "bg-info/15 text-info border-info/30",
  completed:             "bg-accent/15 text-accent border-accent/30",
  cancelled:             "bg-danger/15 text-danger border-danger/30",
  no_show:               "bg-accent-3/30 text-ink-2 border-accent-3/40",
};

export function AgendaView({ appointments }: { appointments: AppointmentDto[] }) {
  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentDto[]>();
    for (const a of appointments) {
      const key = a.starts_at.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries()).sort();
  }, [appointments]);

  if (byDay.length === 0) {
    return (
      <div className="card-paper p-10 text-center text-ink-muted">
        No hay citas en el rango seleccionado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {byDay.map(([date, items], idx) => {
        const d = new Date(date);
        return (
          <motion.div
            key={date}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: idx * 0.04 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="font-display text-2xl">
                {d.toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long" })}
              </div>
              <div className="text-xs text-ink-muted">{items.length} cita{items.length !== 1 && "s"}</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {items.map((a) => (
                <div key={a.id} className="card-paper p-5 hover:border-line-strong transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={14} className="text-accent" />
                        <span className="font-mono text-sm tabular-nums">{fmtTime(a.starts_at)}</span>
                        <span className="text-ink-muted text-xs">→ {fmtTime(a.ends_at)}</span>
                      </div>
                      <div className="font-display text-lg truncate">{a.service.name}</div>
                      <div className="flex items-center gap-1.5 text-xs text-ink-2 mt-1">
                        <Scissors size={11} /> {a.barber.name}
                        <span className="text-ink-muted mx-1">·</span>
                        <User size={11} /> {a.client.name}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn("inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border", STATUS_COLOR[a.status] ?? STATUS_COLOR.cancelled)}>
                        {a.status_label}
                      </span>
                      <div className="font-display text-lg text-accent mt-2">{fmtCents(a.price_cents)}</div>
                      {a.deposit_status === "captured" && (
                        <div className="text-[10px] text-success">Depósito {fmtCents(a.deposit_cents)} ✓</div>
                      )}
                      {a.deposit_status === "forfeited" && (
                        <div className="text-[10px] text-danger">Depósito retenido</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

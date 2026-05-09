"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Lock } from "lucide-react";
import { WEEKDAYS_ES, cn } from "@/lib/utils";

interface Hour {
  weekday: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export function BusinessHoursClient({
  initial,
  canWrite,
}: {
  initial: Hour[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hours, setHours] = useState<Hour[]>(() =>
    [...initial].sort((a, b) => a.weekday - b.weekday),
  );
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function update(weekday: number, patch: Partial<Hour>) {
    setHours((arr) => arr.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/business-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
        cache: "no-store",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as
          | { errors?: Record<string, string[]>; message?: string }
          | null;
        const firstErr = json?.errors ? Object.values(json.errors)[0]?.[0] : null;
        setError(firstErr ?? json?.message ?? "Error al guardar.");
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Operación</div>
          <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">
            Horario público
          </h1>
          <p className="text-ink-2 text-sm mt-3 max-w-xl">
            Define los días y horas en que tu barbería atiende. Los slots disponibles
            para reserva online se calculan a partir de este horario y los turnos de
            cada barbero.
          </p>
        </div>
        {canWrite ? (
          <button
            onClick={save}
            disabled={pending}
            className="btn btn-primary disabled:opacity-50 self-start sm:self-auto"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Guardar
          </button>
        ) : (
          <div className="text-xs text-ink-muted inline-flex items-center gap-1.5">
            <Lock size={12} /> sólo lectura
          </div>
        )}
      </header>

      {error && (
        <div className="p-3 rounded-[10px] bg-danger/8 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}
      {savedAt && (
        <div className="p-3 rounded-[10px] bg-success/8 border border-success/30 text-success text-sm">
          Horarios guardados.
        </div>
      )}

      <div className="card-paper p-4 sm:p-6 space-y-3">
        {hours.map((h) => (
          <div
            key={h.weekday}
            className={cn(
              "grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 sm:gap-6 items-center py-2 border-b border-line-fine last:border-b-0",
              h.is_closed && "opacity-60",
            )}
          >
            <div className="font-display italic text-lg text-ink">
              {WEEKDAYS_ES[h.weekday]}
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!h.is_closed}
                  disabled={!canWrite || pending}
                  onChange={(e) => update(h.weekday, { is_closed: !e.target.checked })}
                />
                <span className="text-ink-2">Abierto</span>
              </label>
              <input
                type="time"
                value={h.open_time}
                disabled={!canWrite || pending || h.is_closed}
                onChange={(e) => update(h.weekday, { open_time: e.target.value })}
                className="input-boxed font-mono w-28 text-sm"
              />
              <span className="text-ink-muted text-xs">a</span>
              <input
                type="time"
                value={h.close_time}
                disabled={!canWrite || pending || h.is_closed}
                onChange={(e) => update(h.weekday, { close_time: e.target.value })}
                className="input-boxed font-mono w-28 text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-muted leading-relaxed max-w-xl">
        Los cambios afectan inmediatamente a la disponibilidad mostrada en
        <code className="font-mono mx-1 text-primary">/b/&lt;tu-slug&gt;</code>.
        Para días con horarios especiales (feriados, eventos), abre un ticket — la
        excepción puntual se gestiona por barbero en <em>Personal</em>.
      </p>
    </div>
  );
}

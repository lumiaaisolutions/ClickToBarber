"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Loader2, X, Clock, User, Scissors, Check } from "lucide-react";
import type { AppointmentDto } from "@/lib/api";
import { cn, fmtCents } from "@/lib/utils";

const TZ = "America/Mexico_City";
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 22;
const TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;
const PX_PER_MIN = 1.1;
const SNAP_MINUTES = 15;
const TOTAL_PX = TOTAL_MINUTES * PX_PER_MIN;

const STATUS_COLOR: Record<string, string> = {
  confirmed:            "bg-success/15 text-success border-success/40",
  pending_confirmation: "bg-warning/15 text-warning border-warning/40",
  in_progress:          "bg-info/15 text-info border-info/40",
  completed:            "bg-accent/15 text-accent border-accent/40",
  cancelled:            "bg-danger/10 text-danger border-danger/40 line-through opacity-60",
  no_show:              "bg-accent-3/20 text-ink-2 border-accent-3/40 opacity-60",
};

const WEEKDAY_LABEL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface Props {
  initialAppointments: AppointmentDto[];
  initialWeekStart: string; // YYYY-MM-DD (lunes)
  barbers: Array<{ id: number; name: string }>;
}

type Mode = "week" | "day";

interface Toast {
  id: number;
  text: string;
  tone: "ok" | "warn" | "danger";
}

export function AgendaCalendar({ initialAppointments, initialWeekStart, barbers }: Props) {
  const [appointments, setAppointments] = useState<AppointmentDto[]>(initialAppointments);
  const [weekStart, setWeekStart] = useState<string>(initialWeekStart);
  const [mode, setMode] = useState<Mode>("week");
  const [selectedDate, setSelectedDate] = useState<string>(initialWeekStart);
  const [loading, setLoading] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AppointmentDto | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);
  const skipFirstFetch = useRef(true);

  // Inicializa selectedDate a hoy si cae dentro de la semana inicial.
  useEffect(() => {
    const todayIso = isoDate(new Date());
    if (todayIso >= initialWeekStart && todayIso <= addDaysIso(initialWeekStart, 6)) {
      setSelectedDate(todayIso);
    }
  }, [initialWeekStart]);

  const days = useMemo(() => {
    if (mode === "day") return [selectedDate];
    return Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i));
  }, [mode, weekStart, selectedDate]);

  const apptsByDay = useMemo(() => {
    const map = new Map<string, AppointmentDto[]>();
    for (const a of appointments) {
      const k = dayKeyInTz(a.starts_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    return map;
  }, [appointments]);

  const refetch = useCallback(async (start: string, daysCount: number) => {
    setLoading(true);
    const endIso = addDaysIso(start, daysCount - 1);
    try {
      const r = await fetch(`/api/admin/agenda?from=${start}&to=${endIso}`, { cache: "no-store" });
      if (r.ok) {
        const json = await r.json();
        if (json && Array.isArray(json.data)) setAppointments(json.data as AppointmentDto[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipFirstFetch.current) { skipFirstFetch.current = false; return; }
    if (mode === "week") refetch(weekStart, 7);
    else refetch(selectedDate, 1);
  }, [mode, weekStart, selectedDate, refetch]);

  function pushToast(text: string, tone: Toast["tone"]) {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }

  function navWeek(deltaDays: number) {
    if (mode === "week") {
      setWeekStart(addDaysIso(weekStart, deltaDays));
    } else {
      const next = addDaysIso(selectedDate, deltaDays === 7 ? 1 : deltaDays === -7 ? -1 : deltaDays);
      setSelectedDate(next);
    }
  }

  function goToday() {
    const todayIso = isoDate(new Date());
    if (mode === "week") setWeekStart(startOfWeekIso(todayIso));
    else setSelectedDate(todayIso);
  }

  async function handleDrop(targetDay: string, dropY: number, gridTop: number, apptId: number) {
    const original = appointments.find((a) => a.id === apptId);
    if (!original) return;

    const minuteOffset = clamp(
      Math.round((dropY - gridTop) / PX_PER_MIN / SNAP_MINUTES) * SNAP_MINUTES,
      0,
      TOTAL_MINUTES - 15,
    );
    const totalMin = DAY_START_HOUR * 60 + minuteOffset;
    const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
    const mm = String(totalMin % 60).padStart(2, "0");
    const newStartLocal = `${targetDay}T${hh}:${mm}:00`;

    const originalStart = dayKeyInTz(original.starts_at);
    const originalMinute = minutesInDayInTz(original.starts_at);
    if (originalStart === targetDay && originalMinute === totalMin) return;

    // Optimistic update: estimar duration y nuevo end
    const durationMin = Math.round((new Date(original.ends_at).getTime() - new Date(original.starts_at).getTime()) / 60000);
    const optimistic: AppointmentDto = {
      ...original,
      starts_at: composeIsoForTz(targetDay, hh, mm, TZ),
      ends_at: composeIsoForTz(targetDay, hh, mm, TZ, durationMin),
    };
    setAppointments((list) => list.map((a) => (a.id === apptId ? optimistic : a)));

    try {
      const res = await fetch(`/api/admin/appointments/${apptId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starts_at: newStartLocal }),
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments((list) =>
          list.map((a) => (a.id === apptId ? { ...a, starts_at: data.starts_at, ends_at: data.ends_at } : a)),
        );
        pushToast(`Reagendado al ${formatTimeInTz(data.starts_at)}`, "ok");
      } else if (res.status === 409) {
        setAppointments((list) => list.map((a) => (a.id === apptId ? original : a)));
        pushToast("Slot ocupado para ese barbero.", "warn");
      } else if (res.status === 422) {
        setAppointments((list) => list.map((a) => (a.id === apptId ? original : a)));
        pushToast("Fecha inválida (debe ser futura).", "warn");
      } else if (res.status === 403) {
        setAppointments((list) => list.map((a) => (a.id === apptId ? original : a)));
        pushToast("No tienes permiso para reagendar.", "danger");
      } else {
        setAppointments((list) => list.map((a) => (a.id === apptId ? original : a)));
        pushToast("No se pudo reagendar.", "danger");
      }
    } catch {
      setAppointments((list) => list.map((a) => (a.id === apptId ? original : a)));
      pushToast("Error de red al reagendar.", "danger");
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 card-paper px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navWeek(mode === "week" ? -7 : -1)}
            className="h-8 w-8 inline-flex items-center justify-center rounded-[8px] border border-line-medium text-ink-2 hover:text-primary hover:border-primary/40 transition"
            aria-label="Anterior"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={goToday}
            className="px-3 h-8 rounded-[8px] border border-line-medium text-xs uppercase tracking-[0.22em] text-ink-2 hover:text-primary hover:border-primary/40 transition"
          >
            Hoy
          </button>
          <button
            onClick={() => navWeek(mode === "week" ? 7 : 1)}
            className="h-8 w-8 inline-flex items-center justify-center rounded-[8px] border border-line-medium text-ink-2 hover:text-primary hover:border-primary/40 transition"
            aria-label="Siguiente"
          >
            <ChevronRight size={15} />
          </button>
          <div className="ml-2 font-display font-bold tracking-tight text-base sm:text-lg text-ink">
            {rangeLabel(mode, weekStart, selectedDate)}
          </div>
          {loading && <Loader2 size={14} className="animate-spin text-ink-muted ml-2" />}
        </div>

        <div className="flex items-center gap-1 bg-bg-vellum border border-line-fine rounded-[10px] p-0.5">
          <button
            onClick={() => setMode("day")}
            className={cn(
              "px-3 py-1.5 text-xs uppercase tracking-[0.22em] rounded-[8px] transition",
              mode === "day" ? "bg-bg-canvas text-primary shadow-sm" : "text-ink-2 hover:text-primary",
            )}
          >
            Día
          </button>
          <button
            onClick={() => setMode("week")}
            className={cn(
              "px-3 py-1.5 text-xs uppercase tracking-[0.22em] rounded-[8px] transition",
              mode === "week" ? "bg-bg-canvas text-primary shadow-sm" : "text-ink-2 hover:text-primary",
            )}
          >
            Semana
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="card-paper overflow-x-auto">
        <div className="min-w-[640px] sm:min-w-0">
          {/* Header de columnas */}
          <div
            className="grid border-b border-line-fine"
            style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}
          >
            <div />
            {days.map((d) => (
              <DayHeader key={d} day={d} count={apptsByDay.get(d)?.length ?? 0} active={isToday(d)} />
            ))}
          </div>

          {/* Grid horario + columnas */}
          <div
            className="grid relative"
            style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}
          >
            {/* Columna de horas */}
            <div className="relative" style={{ height: TOTAL_PX }}>
              {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => {
                const hour = DAY_START_HOUR + i;
                return (
                  <div
                    key={hour}
                    className="absolute right-2 text-[10px] font-mono tabular-nums text-ink-muted"
                    style={{ top: i * 60 * PX_PER_MIN - 6 }}
                  >
                    {String(hour).padStart(2, "0")}:00
                  </div>
                );
              })}
            </div>

            {/* Columnas de día */}
            {days.map((day) => (
              <DayColumn
                key={day}
                day={day}
                appointments={apptsByDay.get(day) ?? []}
                draggingId={draggingId}
                onDragStartAppt={(id) => setDraggingId(id)}
                onDragEndAppt={() => setDraggingId(null)}
                onDrop={handleDrop}
                onClickAppt={(a) => setDetail(a)}
              />
            ))}
          </div>
        </div>
      </div>

      <Legend />

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "px-4 py-2 rounded-[10px] border shadow-lg text-sm bg-bg-paper",
              t.tone === "ok" && "border-success/40 text-success",
              t.tone === "warn" && "border-warning/40 text-warning",
              t.tone === "danger" && "border-danger/40 text-danger",
            )}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Detail drawer */}
      {detail && <AppointmentDetail appt={detail} onClose={() => setDetail(null)} barbers={barbers} />}
    </div>
  );
}

function DayHeader({ day, count, active }: { day: string; count: number; active: boolean }) {
  const d = parseIsoLocal(day);
  return (
    <div
      className={cn(
        "px-3 py-3 border-l border-line-fine flex flex-col items-center justify-center text-center",
        active && "bg-primary/5",
      )}
    >
      <div className={cn("text-[10px] uppercase tracking-[0.28em]", active ? "text-primary" : "text-ink-muted")}>
        {WEEKDAY_LABEL[d.getDay()]}
      </div>
      <div className={cn("font-display text-lg leading-none mt-1", active && "text-primary")}>{d.getDate()}</div>
      <div className="text-[10px] text-ink-muted mt-1">{count} cita{count !== 1 && "s"}</div>
    </div>
  );
}

function DayColumn({
  day, appointments, draggingId, onDragStartAppt, onDragEndAppt, onDrop, onClickAppt,
}: {
  day: string;
  appointments: AppointmentDto[];
  draggingId: number | null;
  onDragStartAppt: (id: number) => void;
  onDragEndAppt: () => void;
  onDrop: (day: string, dropY: number, gridTop: number, id: number) => void;
  onClickAppt: (a: AppointmentDto) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);

  return (
    <div
      ref={ref}
      className="relative border-l border-line-fine"
      style={{ height: TOTAL_PX }}
      onDragOver={(e) => {
        if (draggingId == null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
          const y = e.clientY - rect.top;
          const snapped = clamp(
            Math.round(y / PX_PER_MIN / SNAP_MINUTES) * SNAP_MINUTES * PX_PER_MIN,
            0,
            TOTAL_PX - 12,
          );
          setHoverY(snapped);
        }
      }}
      onDragLeave={() => setHoverY(null)}
      onDrop={(e) => {
        e.preventDefault();
        setHoverY(null);
        if (draggingId == null) return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        onDrop(day, e.clientY, rect.top, draggingId);
      }}
    >
      {/* Líneas horarias */}
      {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => (
        <div
          key={i}
          className={cn(
            "absolute left-0 right-0 border-t",
            i === 0 ? "border-transparent" : "border-line-fine/60",
          )}
          style={{ top: i * 60 * PX_PER_MIN }}
        />
      ))}

      {/* Indicador de drop */}
      {hoverY !== null && (
        <div
          className="absolute left-1 right-1 h-0.5 bg-primary rounded-full pointer-events-none z-20"
          style={{ top: hoverY }}
        />
      )}

      {/* Citas */}
      {appointments.map((a) => (
        <AppointmentBlock
          key={a.id}
          appt={a}
          dragging={draggingId === a.id}
          onDragStart={() => onDragStartAppt(a.id)}
          onDragEnd={onDragEndAppt}
          onClick={() => onClickAppt(a)}
        />
      ))}
    </div>
  );
}

function AppointmentBlock({
  appt, dragging, onDragStart, onDragEnd, onClick,
}: {
  appt: AppointmentDto;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const startMin = minutesInDayInTz(appt.starts_at);
  const endMin = minutesInDayInTz(appt.ends_at);
  const top = clamp((startMin - DAY_START_HOUR * 60) * PX_PER_MIN, 0, TOTAL_PX);
  const rawHeight = (endMin - startMin) * PX_PER_MIN;
  const height = Math.max(28, rawHeight - 2);
  const draggable = !["cancelled", "no_show", "completed"].includes(appt.status);

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) { e.preventDefault(); return; }
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(appt.id));
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "absolute left-1 right-1 rounded-[8px] border px-2 py-1 text-left transition cursor-pointer overflow-hidden",
        STATUS_COLOR[appt.status] ?? STATUS_COLOR.cancelled,
        dragging && "opacity-40",
        draggable && "hover:shadow-md hover:-translate-y-0.5 hover:z-10",
        !draggable && "cursor-not-allowed",
      )}
      style={{ top, height }}
      title={`${appt.service.name} · ${appt.client.name}`}
    >
      <div className="text-[10px] font-mono tabular-nums opacity-80">
        {formatTimeInTz(appt.starts_at)}–{formatTimeInTz(appt.ends_at)}
      </div>
      <div className="text-xs font-medium truncate leading-tight mt-0.5">{appt.client.name}</div>
      {height > 44 && (
        <div className="text-[10px] truncate opacity-70 leading-tight">{appt.service.name}</div>
      )}
    </button>
  );
}

function AppointmentDetail({
  appt, onClose, barbers,
}: { appt: AppointmentDto; onClose: () => void; barbers: Array<{ id: number; name: string }> }) {
  const [reassignTo, setReassignTo] = useState<number>(appt.barber.id);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reassign() {
    setPending(true);
    setError(null);
    try {
      const localStart = `${dayKeyInTz(appt.starts_at)}T${formatTimeInTz(appt.starts_at)}:00`;
      const r = await fetch(`/api/admin/appointments/${appt.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starts_at: localStart, barber_id: reassignTo }),
      });
      if (r.ok) {
        onClose();
        // Forzar refresh leyendo agenda al cerrar el detalle.
        window.location.reload();
      } else if (r.status === 409) {
        setError("Ese barbero ya tiene cita en esa hora.");
      } else {
        setError("No se pudo reasignar.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-bg-paper border-l border-line-fine shadow-2xl p-6 overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-accent">{appt.status_label}</div>
            <h2 className="font-display font-bold tracking-tight text-2xl mt-1">{appt.service.name}</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-[8px] border border-line-fine hover:border-primary/40 hover:text-primary">
            <X size={15} />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <Row icon={<Clock size={14} className="text-accent" />} label="Hora">
            {formatTimeInTz(appt.starts_at)} → {formatTimeInTz(appt.ends_at)} · {dayKeyInTz(appt.starts_at)}
          </Row>
          <Row icon={<User size={14} className="text-accent" />} label="Cliente">
            {appt.client.name} <span className="text-ink-muted text-xs">({appt.client.email})</span>
          </Row>
          <Row icon={<Scissors size={14} className="text-accent" />} label="Barbero">
            {appt.barber.name}
          </Row>
          <Row icon={<CalendarDays size={14} className="text-accent" />} label="Precio">
            <span className="font-mono">{fmtCents(appt.price_cents)}</span>
            {appt.deposit_status === "captured" && (
              <span className="ml-2 text-success text-xs inline-flex items-center gap-0.5">Depósito {fmtCents(appt.deposit_cents)} <Check size={10} strokeWidth={2.5} /></span>
            )}
            {appt.deposit_status === "forfeited" && (
              <span className="ml-2 text-danger text-xs">Depósito retenido</span>
            )}
          </Row>
        </div>

        {barbers.length > 0 && !["cancelled", "no_show", "completed"].includes(appt.status) && (
          <div className="mt-6 pt-5 border-t border-line-fine space-y-3">
            <div className="text-[10px] uppercase tracking-[0.28em] text-ink-muted">Reasignar barbero</div>
            <select
              className="input-boxed w-full"
              value={reassignTo}
              onChange={(e) => setReassignTo(Number(e.target.value))}
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {error && <p className="text-xs text-danger">{error}</p>}
            <button
              onClick={reassign}
              disabled={pending || reassignTo === appt.barber.id}
              className="btn btn-primary w-full justify-center disabled:opacity-50"
            >
              {pending && <Loader2 size={14} className="animate-spin" />}
              Reasignar
            </button>
          </div>
        )}

        <p className="text-[11px] text-ink-muted mt-6 leading-relaxed">
          Tip: arrastra la cita en el calendario para reagendar a otra hora del mismo o de otro día.
        </p>
      </div>
    </>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-[0.22em] text-ink-muted">{label}</div>
        <div className="text-ink mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-ink-2">
      {Object.entries({
        confirmed: "Confirmada",
        pending_confirmation: "Pendiente",
        in_progress: "En curso",
        completed: "Completada",
        cancelled: "Cancelada",
      }).map(([key, label]) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span className={cn("w-2.5 h-2.5 rounded-full border", STATUS_COLOR[key])} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ---------- Helpers ----------

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseIsoLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDaysIso(iso: string, delta: number): string {
  const d = parseIsoLocal(iso);
  d.setDate(d.getDate() + delta);
  return isoDate(d);
}

function startOfWeekIso(iso: string): string {
  const d = parseIsoLocal(iso);
  const wd = d.getDay();
  const diff = wd === 0 ? -6 : 1 - wd;
  d.setDate(d.getDate() + diff);
  return isoDate(d);
}

function isToday(iso: string): boolean {
  return iso === isoDate(new Date());
}

function partsInTz(iso: string) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = f.formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function dayKeyInTz(iso: string): string {
  const p = partsInTz(iso);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function minutesInDayInTz(iso: string): number {
  const p = partsInTz(iso);
  return p.hour * 60 + p.minute;
}

function formatTimeInTz(iso: string): string {
  const p = partsInTz(iso);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/**
 * Devuelve un ISO string equivalente a la wall-clock `day HH:MM` interpretada en `tz`.
 * Usamos un wall-clock UTC de partida y ajustamos por la diferencia que `tz` aplica a esa fecha.
 */
function composeIsoForTz(day: string, hh: string, mm: string, tz: string, plusMinutes = 0): string {
  const [y, mo, d] = day.split("-").map(Number);
  const baseUtc = Date.UTC(y, mo - 1, d, Number(hh), Number(mm), 0) + plusMinutes * 60_000;
  // Calcula el offset que `tz` aplica a esa instante UTC:
  const localized = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date(baseUtc));
  const get = (t: string) => Number(localized.find((p) => p.type === t)?.value ?? "0");
  const asLocal = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const offsetMs = asLocal - baseUtc; // si tz va por detrás de UTC esto es negativo
  return new Date(baseUtc - offsetMs).toISOString();
}

function rangeLabel(mode: Mode, weekStart: string, selectedDate: string): string {
  if (mode === "day") {
    const d = parseIsoLocal(selectedDate);
    return d.toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }
  const a = parseIsoLocal(weekStart);
  const b = parseIsoLocal(addDaysIso(weekStart, 6));
  const sameMonth = a.getMonth() === b.getMonth();
  const fmt = (d: Date, withMonth: boolean) =>
    d.toLocaleDateString("es-MX", { day: "2-digit", ...(withMonth ? { month: "long" } : {}) });
  return sameMonth
    ? `${fmt(a, false)} – ${fmt(b, true)} ${b.getFullYear()}`
    : `${fmt(a, true)} – ${fmt(b, true)} ${b.getFullYear()}`;
}

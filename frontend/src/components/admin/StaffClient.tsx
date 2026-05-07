"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Check, Loader2, Lock, Mail, Phone, Scissors } from "lucide-react";
import { WEEKDAYS_ES } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Barber {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  bio?: string | null;
  specialties: string[];
  commission_pct: number;
  default_slot_minutes?: number;
  is_active: boolean;
  shifts: Array<{ id?: number; weekday: number; start: string; end: string }>;
  services_count: number;
}

type FormState = {
  name: string;
  email: string;
  phone: string;
  avatar_url: string;
  bio: string;
  specialties: string;
  default_slot_minutes: number;
  commission_pct: number;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  avatar_url: "",
  bio: "",
  specialties: "",
  default_slot_minutes: 45,
  commission_pct: 40,
  is_active: true,
};

export function StaffClient({
  initial,
  role,
  email,
  canWrite,
}: {
  initial: Barber[];
  role: string;
  email: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Barber | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isBarberRole = role === "barber";
  const myBarberCard = isBarberRole ? initial.find((b) => b.email === email) : null;

  function openCreate() { if (canWrite) setEditing("new"); }
  function openEdit(b: Barber) { if (canWrite) setEditing(b); }
  function close() { setEditing(null); setError(null); }

  function save(form: FormState) {
    setError(null);
    const isCreate = editing === "new";
    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      avatar_url: form.avatar_url || null,
      bio: form.bio || null,
      specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
      default_slot_minutes: Number(form.default_slot_minutes),
      commission_pct: Number(form.commission_pct),
      is_active: form.is_active,
    };

    startTransition(async () => {
      const url = isCreate
        ? "/api/admin/staff"
        : `/api/admin/staff/${(editing as Barber).id}`;
      const method = isCreate ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { message?: string; errors?: Record<string, string[]> } | null;
        const firstErr = json?.errors ? Object.values(json.errors)[0]?.[0] : null;
        setError(firstErr ?? json?.message ?? "Error al guardar.");
        return;
      }
      close();
      router.refresh();
    });
  }

  function remove(b: Barber) {
    if (!confirm(`¿Eliminar a ${b.name}? Esta acción es reversible (soft-delete).`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/staff/${b.id}`, { method: "DELETE", cache: "no-store" });
      if (!res.ok) {
        setError("No se pudo eliminar.");
        return;
      }
      router.refresh();
    });
  }

  // Vista barbero: solo su tarjeta + edición de horarios
  if (isBarberRole && myBarberCard) {
    return (
      <BarberMyView barber={myBarberCard} />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Personal</div>
          <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Tus barberos</h1>
          <p className="text-ink-2 text-sm mt-3">{initial.length} en activo. Cada uno con sus horarios y comisiones.</p>
        </div>
        {canWrite ? (
          <button onClick={openCreate} className="btn btn-primary self-start sm:self-auto">
            <Plus size={14} /> Añadir barbero
          </button>
        ) : (
          <div className="text-xs text-ink-muted inline-flex items-center gap-1.5"><Lock size={12} /> sólo lectura</div>
        )}
      </header>

      {error && <div className="p-3 rounded-[10px] bg-danger/8 border border-danger/30 text-danger text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {initial.map((b) => (
          <article key={b.id} className="card-paper p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              {b.avatar ? (
                <img src={b.avatar} alt={b.name} className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl object-cover ring-1 ring-line-strong shrink-0" />
              ) : (
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-bg-sage flex items-center justify-center text-primary font-display italic text-xl sm:text-2xl shrink-0">
                  {b.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display italic text-lg sm:text-2xl text-ink truncate">{b.name}</h2>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {b.specialties.map((s) => (
                        <span key={s} className="text-[10px] tracking-imperial px-2 py-0.5 rounded-full bg-bg-vellum border border-line-medium text-ink-2">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] tracking-imperial text-ink-muted">Comisión</div>
                    <div className="font-display italic text-2xl sm:text-3xl text-primary tabular-nums">{b.commission_pct}%</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 text-[11px] sm:text-xs text-ink-2 break-all sm:break-normal">
                  {b.email && <span className="inline-flex items-center gap-1 min-w-0"><Mail size={11} className="shrink-0" /> <span className="truncate">{b.email}</span></span>}
                  {b.phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {b.phone}</span>}
                  <span className="inline-flex items-center gap-1"><Scissors size={11} /> {b.services_count} servicios</span>
                </div>
              </div>
            </div>

            <hr className="hairline-gold my-4 sm:my-5" />

            <div>
              <div className="text-[10px] tracking-imperial text-ink-muted mb-3">Horario semanal</div>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS_ES.map((d, i) => {
                  const shift = b.shifts.find((s) => s.weekday === i);
                  return (
                    <div key={d} className="text-center p-1 sm:p-2 rounded-[8px] border border-line-fine text-[10px] sm:text-[11px]">
                      <div className="text-[9px] tracking-imperial text-ink-muted">{d}</div>
                      <div className="font-mono text-ink mt-1 text-[10px] sm:text-[11px]">{shift ? shift.start.slice(0,5) : "—"}</div>
                      <div className="font-mono text-ink-2 text-[9px] sm:text-[10px]">{shift ? shift.end.slice(0,5) : ""}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {canWrite && (
              <div className="mt-5 pt-4 border-t border-line-fine flex items-center gap-2">
                <button onClick={() => openEdit(b)} className="btn btn-ghost text-xs py-1.5 px-3"><Pencil size={12} /> Editar</button>
                <button onClick={() => remove(b)} className="btn btn-ghost text-xs py-1.5 px-3 text-danger hover:!border-danger"><Trash2 size={12} /> Eliminar</button>
              </div>
            )}
          </article>
        ))}
      </div>

      {editing && (
        <BarberFormModal
          initial={editing === "new" ? null : editing}
          pending={pending}
          onCancel={close}
          onSubmit={save}
        />
      )}
    </div>
  );
}

function BarberFormModal({
  initial,
  pending,
  onCancel,
  onSubmit,
}: {
  initial: Barber | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (f: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>(() => initial ? {
    name: initial.name,
    email: initial.email ?? "",
    phone: initial.phone ?? "",
    avatar_url: initial.avatar ?? "",
    bio: initial.bio ?? "",
    specialties: initial.specialties.join(", "),
    default_slot_minutes: initial.default_slot_minutes ?? 45,
    commission_pct: initial.commission_pct,
    is_active: initial.is_active,
  } : EMPTY_FORM);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:px-4 sm:py-6 bg-ink/40 backdrop-blur-sm overflow-y-auto" onClick={onCancel}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
        className="card-paper w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-8 my-auto"
      >
        <header className="flex items-start justify-between mb-5 sm:mb-7 gap-3">
          <div className="min-w-0">
            <div className="text-[10px] tracking-imperial text-accent-3 mb-1">{initial ? "Editar" : "Nuevo"}</div>
            <h2 className="font-display italic text-2xl sm:text-3xl text-ink truncate">{initial ? initial.name : "Nuevo barbero"}</h2>
          </div>
          <button type="button" onClick={onCancel} className="text-ink-muted hover:text-ink p-1 shrink-0"><X size={18} /></button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre">
            <input className="input-boxed" value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </Field>
          <Field label="Email">
            <input className="input-boxed" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </Field>
          <Field label="Teléfono / WhatsApp">
            <input className="input-boxed" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+5215511110001" />
          </Field>
          <Field label="Avatar URL">
            <input className="input-boxed font-mono" value={form.avatar_url} onChange={(e) => update("avatar_url", e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Especialidades (separadas por coma)" className="sm:col-span-2">
            <input className="input-boxed" value={form.specialties} onChange={(e) => update("specialties", e.target.value)} placeholder="fade, barba, navaja" />
          </Field>
          <Field label="Bio" className="sm:col-span-2">
            <textarea className="input-boxed" rows={2} value={form.bio} onChange={(e) => update("bio", e.target.value)} />
          </Field>
          <Field label="Slot por defecto (min)">
            <input className="input-boxed font-mono" type="number" min={10} max={240} value={form.default_slot_minutes} onChange={(e) => update("default_slot_minutes", Number(e.target.value))} />
          </Field>
          <Field label="Comisión (%)">
            <input className="input-boxed font-mono" type="number" step="0.5" min={0} max={100} value={form.commission_pct} onChange={(e) => update("commission_pct", Number(e.target.value))} />
          </Field>
          <Field label="Estado" className="sm:col-span-2">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} />
              <span className="text-sm">Activo (recibe reservas)</span>
            </label>
          </Field>
        </div>

        <div className="mt-7 flex items-center justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn btn-ghost">Cancelar</button>
          <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-50">
            {pending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

function BarberMyView({ barber }: { barber: Barber }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [shifts, setShifts] = useState<Array<{ weekday: number; start: string; end: string }>>(() =>
    Array.from({ length: 7 }, (_, weekday) => {
      const existing = barber.shifts.find((s) => s.weekday === weekday);
      return existing
        ? { weekday, start: existing.start.slice(0, 5), end: existing.end.slice(0, 5) }
        : { weekday, start: "", end: "" };
    })
  );

  function setShift(weekday: number, key: "start" | "end", value: string) {
    setShifts((arr) => arr.map((s) => s.weekday === weekday ? { ...s, [key]: value } : s));
    setSaved(false);
  }

  function save() {
    setError(null);
    const payload = {
      shifts: shifts
        .filter((s) => s.start && s.end)
        .map((s) => ({ weekday: s.weekday, start_time: s.start, end_time: s.end })),
    };

    startTransition(async () => {
      const res = await fetch("/api/admin/staff/me/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (!res.ok) {
        setError("No se pudo guardar.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Mis horarios</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">{barber.name}</h1>
        <p className="text-ink-2 text-sm mt-3">
          Esto es lo que verán tus clientes al elegirte. Vacío = no trabajas ese día.
        </p>
      </header>

      <div className="card-paper p-4 sm:p-7">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {WEEKDAYS_ES.map((d, weekday) => {
            const s = shifts[weekday];
            return (
              <div key={d} className="space-y-2">
                <div className="text-[10px] tracking-imperial text-ink-muted text-center">{d}</div>
                <input type="time" value={s.start} onChange={(e) => setShift(weekday, "start", e.target.value)} className="input-boxed font-mono text-xs text-center w-full" />
                <input type="time" value={s.end} onChange={(e) => setShift(weekday, "end", e.target.value)} className="input-boxed font-mono text-xs text-center w-full" />
              </div>
            );
          })}
        </div>

        {error && <div className="mt-4 p-3 rounded-[10px] bg-danger/8 border border-danger/30 text-danger text-sm">{error}</div>}

        <div className="mt-6 flex items-center gap-3">
          <button onClick={save} disabled={pending} className="btn btn-primary disabled:opacity-50">
            {pending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
            Guardar mis horarios
          </button>
          {saved && <span className="text-xs text-success italic">Guardado.</span>}
        </div>
      </div>

      <div className="card-paper p-6 bg-bg-vellum/40">
        <div className="text-[10px] tracking-imperial text-ink-muted mb-2">Servicios que ofreces</div>
        <div className="text-ink">{barber.services_count} servicios asignados.</div>
        <p className="text-xs text-ink-2 mt-2 italic">Los servicios y comisiones los gestiona el administrador. Si necesitas cambiar algo, pídelo.</p>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-[10px] tracking-imperial text-ink-muted mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

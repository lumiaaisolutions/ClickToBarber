"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Check, Loader2, Lock, Clock } from "lucide-react";
import { fmtCents } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Service {
  id: number;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  is_active: boolean;
}

type FormState = {
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
  is_active: boolean;
};

const EMPTY: FormState = { name: "", description: "", duration_minutes: 45, price_cents: 25000, is_active: true };

export function ServicesClient({ initial, canWrite }: { initial: Service[]; canWrite: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save(form: FormState) {
    setError(null);
    const isCreate = editing === "new";
    const payload = {
      name: form.name,
      description: form.description || null,
      duration_minutes: Number(form.duration_minutes),
      price_cents: Number(form.price_cents),
      is_active: form.is_active,
    };

    startTransition(async () => {
      const url = isCreate ? "/api/admin/services" : `/api/admin/services/${(editing as Service).id}`;
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
      setEditing(null);
      router.refresh();
    });
  }

  function remove(s: Service) {
    if (!confirm(`¿Eliminar el servicio "${s.name}"?`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/services/${s.id}`, { method: "DELETE", cache: "no-store" });
      if (!res.ok) { setError("No se pudo eliminar."); return; }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Catálogo</div>
          <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Servicios</h1>
          <p className="text-ink-2 text-sm mt-3">{initial.length} servicios disponibles para reserva.</p>
        </div>
        {canWrite ? (
          <button onClick={() => setEditing("new")} className="btn btn-primary self-start sm:self-auto"><Plus size={14} /> Añadir servicio</button>
        ) : (
          <div className="text-xs text-ink-muted inline-flex items-center gap-1.5"><Lock size={12} /> sólo lectura</div>
        )}
      </header>

      {error && <div className="p-3 rounded-[10px] bg-danger/8 border border-danger/30 text-danger text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {initial.map((s) => (
          <article key={s.id} className="card-paper p-4 sm:p-6 group flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="font-display italic text-xl sm:text-2xl text-ink">{s.name}</h2>
              <span className={cn(
                "text-[10px] tracking-imperial px-2 py-0.5 rounded-full",
                s.is_active ? "bg-success/12 text-success border border-success/30" : "bg-danger/12 text-danger border border-danger/30",
              )}>
                {s.is_active ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p className="text-sm text-ink-2 leading-relaxed mb-5 flex-1 min-h-[40px]">{s.description}</p>
            <hr className="hairline mb-4" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-muted inline-flex items-center gap-1.5">
                <Clock size={12} /> {s.duration_minutes} min
              </span>
              <span className="font-display italic text-2xl sm:text-3xl text-primary tabular-nums">{fmtCents(s.price_cents, s.currency)}</span>
            </div>
            {canWrite && (
              <div className="mt-5 pt-4 border-t border-line-fine flex items-center gap-2">
                <button onClick={() => setEditing(s)} className="btn btn-ghost text-xs py-1.5 px-3"><Pencil size={12} /> Editar</button>
                <button onClick={() => remove(s)} className="btn btn-ghost text-xs py-1.5 px-3 text-danger hover:!border-danger"><Trash2 size={12} /> Eliminar</button>
              </div>
            )}
          </article>
        ))}
      </div>

      {editing && (
        <ServiceFormModal
          initial={editing === "new" ? null : editing}
          pending={pending}
          onCancel={() => { setEditing(null); setError(null); }}
          onSubmit={save}
        />
      )}
    </div>
  );
}

function ServiceFormModal({
  initial,
  pending,
  onCancel,
  onSubmit,
}: {
  initial: Service | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (f: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>(() => initial ? {
    name: initial.name,
    description: initial.description ?? "",
    duration_minutes: initial.duration_minutes,
    price_cents: initial.price_cents,
    is_active: initial.is_active,
  } : EMPTY);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:px-4 sm:py-6 bg-ink/40 backdrop-blur-sm overflow-y-auto" onClick={onCancel}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
        className="card-paper w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-8 my-auto"
      >
        <header className="flex items-start justify-between mb-5 sm:mb-7 gap-3">
          <div className="min-w-0">
            <div className="text-[10px] tracking-imperial text-accent-3 mb-1">{initial ? "Editar" : "Nuevo"}</div>
            <h2 className="font-display italic text-2xl sm:text-3xl text-ink truncate">{initial ? initial.name : "Nuevo servicio"}</h2>
          </div>
          <button type="button" onClick={onCancel} className="text-ink-muted hover:text-ink p-1 shrink-0"><X size={18} /></button>
        </header>

        <div className="space-y-4">
          <Field label="Nombre"><input className="input-boxed" value={form.name} onChange={(e) => update("name", e.target.value)} required /></Field>
          <Field label="Descripción"><textarea className="input-boxed" rows={2} value={form.description} onChange={(e) => update("description", e.target.value)} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Duración (min)"><input type="number" min={10} max={240} className="input-boxed font-mono" value={form.duration_minutes} onChange={(e) => update("duration_minutes", Number(e.target.value))} /></Field>
            <Field label="Precio (centavos)"><input type="number" min={0} className="input-boxed font-mono" value={form.price_cents} onChange={(e) => update("price_cents", Number(e.target.value))} /></Field>
          </div>
          <Field label="Estado">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} />
              <span className="text-sm">Disponible para reserva</span>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-imperial text-ink-muted mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

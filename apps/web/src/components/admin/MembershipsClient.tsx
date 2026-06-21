"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, Loader2, Crown } from "lucide-react";
import { fmtCents } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

interface Plan {
  id: number; name: string; price_cents: number; currency: string;
  included_services_per_month: number; eligible_service_ids: number[] | null;
  is_active: boolean;
}

export function MembershipsClient({
  initial,
}: { initial: { plans: Plan[]; kpis: { active_subscribers: number } } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState(39900);
  const [included, setIncluded] = useState(2);

  function create(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await fetch("/api/admin/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price_cents: price, included_services_per_month: included }),
      });
      setOpen(false); setName(""); setPrice(39900); setIncluded(2);
      router.refresh();
    });
  }

  function remove(id: number) {
    if (!confirm("¿Eliminar esta membresía?")) return;
    startTransition(async () => {
      await fetch(`/api/admin/memberships/${id}`, { method: "DELETE" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Crecimiento</div>
          <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Membresías</h1>
          <p className="text-ink-2 text-sm mt-3 max-w-xl leading-relaxed">
            Pre-pago mensual del cliente final con N servicios incluidos. Aumenta MRR y locking.
            Hoy: <strong>{initial.kpis.active_subscribers}</strong> clientes con plan activo.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn btn-primary self-start sm:self-auto">
          <Plus size={14} /> Nueva membresía
        </button>
      </header>

      {initial.plans.length === 0 ? (
        <EmptyState icon={<Crown size={20} />} title="Sin planes" description="Crea tu primer plan de membresía." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {initial.plans.map((p) => (
            <article key={p.id} className="card-paper p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-display italic text-xl text-ink">{p.name}</h3>
                <button onClick={() => remove(p.id)} className="text-danger hover:opacity-80">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="font-display italic text-3xl text-primary tabular-nums mb-2">
                {fmtCents(p.price_cents, p.currency)}
                <span className="text-sm text-ink-muted ml-1">/mes</span>
              </div>
              <p className="text-sm text-ink-2">
                Incluye <strong>{p.included_services_per_month}</strong> servicios al mes.
              </p>
            </article>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/40 backdrop-blur-sm overflow-y-auto" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={create} className="card-paper w-full max-w-md p-5 sm:p-7 space-y-4 my-auto">
            <div className="flex items-start justify-between">
              <h2 className="font-display italic text-2xl text-ink">Nueva membresía</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-ink-muted p-1"><X size={18} /></button>
            </div>
            <div>
              <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Nombre</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className="input-boxed" placeholder="Plan Premium" />
            </div>
            <div>
              <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Precio (centavos)</label>
              <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="input-boxed font-mono" />
            </div>
            <div>
              <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Servicios incluidos / mes</label>
              <input type="number" min={1} max={60} value={included} onChange={(e) => setIncluded(Number(e.target.value))} className="input-boxed font-mono" />
            </div>
            <button type="submit" disabled={pending} className="btn btn-primary w-full justify-center">
              {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

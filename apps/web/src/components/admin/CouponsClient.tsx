"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, Check, Loader2, Ticket, Copy } from "lucide-react";
import { fmtCents, cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

interface Coupon {
  id: number;
  code: string;
  discount_pct: number | null;
  discount_cents: number | null;
  expires_at: string | null;
  redeemed_at: string | null;
}

type Mode = "single" | "bulk";

export function CouponsClient({ initial }: { initial: Coupon[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("single");
  const [discountKind, setDiscountKind] = useState<"pct" | "cents">("pct");
  const [discountValue, setDiscountValue] = useState(15);
  const [count, setCount] = useState(10);
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function emit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const url = mode === "single" ? "/api/admin/coupons" : "/api/admin/coupons/bulk";
    const body: Record<string, unknown> = {
      [discountKind === "pct" ? "discount_pct" : "discount_cents"]: discountValue,
      expires_at: expiresAt || null,
    };
    if (mode === "bulk") body.count = count;

    startTransition(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        const msg = d?.errors ? Object.values(d.errors as Record<string, string[]>)[0]?.[0] : null;
        setError(msg ?? d?.message ?? "Error al emitir.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function remove(id: number) {
    if (!confirm("¿Borrar este cupón?")) return;
    startTransition(async () => {
      await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      router.refresh();
    });
  }

  async function copy(code: string) {
    await navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Marketing</div>
          <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Cupones</h1>
          <p className="text-ink-2 text-sm mt-3 max-w-xl leading-relaxed">
            Códigos únicos trazables. Genera uno o emite en lote para campañas masivas.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn btn-primary self-start sm:self-auto">
          <Plus size={14} /> Emitir cupón
        </button>
      </header>

      {initial.length === 0 ? (
        <EmptyState icon={<Ticket size={20} />} title="Sin cupones todavía" description="Pulsa Emitir cupón para crear el primero." />
      ) : (
        <div className="card-paper overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="text-[10px] uppercase tracking-imperial text-ink-muted">
                <tr className="border-b border-line-fine">
                  <th className="text-left px-4 sm:px-6 py-3">Código</th>
                  <th className="text-left px-3 py-3">Descuento</th>
                  <th className="text-left px-3 py-3">Vence</th>
                  <th className="text-left px-3 py-3">Estado</th>
                  <th className="text-right px-4 sm:px-6 py-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {initial.map((c) => (
                  <tr key={c.id} className="border-b border-line-fine last:border-0">
                    <td className="px-4 sm:px-6 py-3">
                      <button onClick={() => copy(c.code)} className="font-mono text-primary inline-flex items-center gap-1.5 hover:underline">
                        {c.code} {copied === c.code ? <Check size={11} /> : <Copy size={11} className="opacity-50" />}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-ink-2">
                      {c.discount_pct ? `${c.discount_pct}%` : c.discount_cents ? fmtCents(c.discount_cents, "MXN") : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-muted">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString("es-MX") : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        "text-[10px] tracking-imperial px-2 py-0.5 rounded-full inline-block",
                        c.redeemed_at ? "bg-bg-vellum text-ink-muted" : "bg-success/15 text-success border border-success/30",
                      )}>
                        {c.redeemed_at ? "Usado" : "Activo"}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-right">
                      <button onClick={() => remove(c.id)} className="btn btn-ghost text-xs py-1 px-2.5 text-danger hover:!border-danger">
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/40 backdrop-blur-sm overflow-y-auto" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={emit} className="card-paper w-full max-w-md p-5 sm:p-7 space-y-4 my-auto">
            <header className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] tracking-imperial text-accent-3 mb-1">Nuevo</div>
                <h2 className="font-display italic text-2xl text-ink">Emitir cupón</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink p-1"><X size={18} /></button>
            </header>

            <div className="flex gap-2">
              <button type="button" onClick={() => setMode("single")} className={cn("btn flex-1 justify-center text-xs", mode === "single" ? "btn-primary" : "btn-ghost")}>Un código</button>
              <button type="button" onClick={() => setMode("bulk")} className={cn("btn flex-1 justify-center text-xs", mode === "bulk" ? "btn-primary" : "btn-ghost")}>Lote</button>
            </div>

            {mode === "bulk" && (
              <div>
                <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Cantidad</label>
                <input type="number" min={1} max={500} value={count} onChange={(e) => setCount(Number(e.target.value))} className="input-boxed font-mono" />
              </div>
            )}

            <div>
              <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Tipo de descuento</label>
              <select value={discountKind} onChange={(e) => setDiscountKind(e.target.value as "pct" | "cents")} className="input-boxed">
                <option value="pct">Porcentaje (%)</option>
                <option value="cents">Monto fijo (centavos)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">
                Valor {discountKind === "pct" ? "(%)" : "(centavos)"}
              </label>
              <input type="number" min={1} max={discountKind === "pct" ? 100 : 999999} value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} className="input-boxed font-mono" required />
            </div>

            <div>
              <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Fecha de vencimiento (opcional)</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="input-boxed" />
            </div>

            {error && <div className="text-sm bg-danger/8 border border-danger/30 rounded-[10px] px-4 py-3 text-danger">{error}</div>}

            <button type="submit" disabled={pending} className="btn btn-primary w-full justify-center">
              {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {mode === "bulk" ? `Emitir ${count} códigos` : "Emitir código"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

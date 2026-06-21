"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gift, Plus, X, Loader2 } from "lucide-react";
import { fmtCents, cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

interface GiftCard {
  id: number; code: string; value_cents: number; balance_cents: number; currency: string;
  recipient_email: string | null; recipient_name: string | null;
  redeemed_at: string | null; expires_at: string | null;
}

export function GiftCardsClient({ initial }: { initial: GiftCard[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(50000);
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");

  function create(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await fetch("/api/admin/giftcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value_cents: value,
          recipient_email: recipient || null,
          recipient_name: recipientName || null,
        }),
      });
      setOpen(false); setValue(50000); setRecipient(""); setRecipientName("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Regalos</div>
          <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Gift cards</h1>
          <p className="text-ink-2 text-sm mt-3 max-w-xl leading-relaxed">
            Vende certificados de regalo. El destinatario los canjea en cualquier ticket POS de tu barbería.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn btn-primary self-start sm:self-auto">
          <Plus size={14} /> Emitir gift card
        </button>
      </header>

      {initial.length === 0 ? (
        <EmptyState icon={<Gift size={20} />} title="Sin gift cards emitidas" />
      ) : (
        <div className="card-paper overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="text-[10px] uppercase tracking-imperial text-ink-muted">
                <tr className="border-b border-line-fine">
                  <th className="text-left px-4 sm:px-6 py-3">Código</th>
                  <th className="text-left px-3 py-3">Valor</th>
                  <th className="text-left px-3 py-3">Balance</th>
                  <th className="text-left px-3 py-3">Para</th>
                  <th className="text-left px-4 sm:px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {initial.map((c) => (
                  <tr key={c.id} className="border-b border-line-fine last:border-0">
                    <td className="px-4 sm:px-6 py-3 font-mono">{c.code}</td>
                    <td className="px-3 py-3 tabular-nums">{fmtCents(c.value_cents, c.currency)}</td>
                    <td className="px-3 py-3 tabular-nums">{fmtCents(c.balance_cents, c.currency)}</td>
                    <td className="px-3 py-3 text-ink-2">{c.recipient_name ?? c.recipient_email ?? "—"}</td>
                    <td className="px-4 sm:px-6 py-3">
                      <span className={cn(
                        "text-[10px] tracking-imperial px-2 py-0.5 rounded-full inline-block",
                        c.redeemed_at ? "bg-bg-vellum text-ink-muted" : "bg-success/15 text-success border border-success/30",
                      )}>
                        {c.redeemed_at ? "Redimida" : "Activa"}
                      </span>
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
          <form onClick={(e) => e.stopPropagation()} onSubmit={create} className="card-paper w-full max-w-md p-5 sm:p-7 space-y-4 my-auto">
            <div className="flex items-start justify-between">
              <h2 className="font-display italic text-2xl text-ink">Nueva gift card</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-ink-muted p-1"><X size={18} /></button>
            </div>
            <div>
              <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Valor (centavos)</label>
              <input type="number" min={1} value={value} onChange={(e) => setValue(Number(e.target.value))} className="input-boxed font-mono" required />
            </div>
            <div>
              <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Email destinatario (opcional)</label>
              <input type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="input-boxed" />
            </div>
            <div>
              <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Nombre destinatario (opcional)</label>
              <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="input-boxed" />
            </div>
            <button type="submit" disabled={pending} className="btn btn-primary w-full justify-center">
              {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Emitir
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

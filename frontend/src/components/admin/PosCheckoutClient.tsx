"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Trash2, Loader2, ScrollText, CheckCircle2 } from "lucide-react";
import { fmtCents } from "@/lib/utils";

interface Item { kind: "service" | "product"; id: number; name: string; unit: number; qty: number; }
interface Service { id: number; name: string; price_cents: number; }
interface Product { id: number; name: string; sku: string; price_cents: number; stock: number; }
interface Barber { id: number; name: string; }

export function PosCheckoutClient({
  services, products, barbers,
}: {
  services: Service[]; products: Product[]; barbers: Barber[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? 0);
  const [items, setItems] = useState<Item[]>([]);
  const [coupon, setCoupon] = useState("");
  const [giftCard, setGiftCard] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [tipCents, setTipCents] = useState(0);
  const [closed, setClosed] = useState<{ ticket_id: number; total_cents: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.unit * i.qty, 0), [items]);

  function add(kind: "service" | "product", source: Service | Product) {
    setItems((arr) => {
      const existing = arr.findIndex((x) => x.kind === kind && x.id === source.id);
      if (existing >= 0) {
        const next = [...arr];
        next[existing] = { ...next[existing], qty: next[existing].qty + 1 };
        return next;
      }
      return [...arr, { kind, id: source.id, name: source.name, unit: source.price_cents, qty: 1 }];
    });
  }

  function setQty(idx: number, qty: number) {
    if (qty <= 0) return setItems((arr) => arr.filter((_, i) => i !== idx));
    setItems((arr) => arr.map((it, i) => i === idx ? { ...it, qty } : it));
  }

  function close() {
    if (items.length === 0) return setError("Agrega al menos un servicio o producto.");
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/pos/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barber_id: barberId,
          items: items.map((i) => ({ kind: i.kind, id: i.id, qty: i.qty })),
          coupon_code: coupon || null,
          gift_card_code: giftCard || null,
          payment_method: paymentMethod,
          tip_cents: tipCents,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Error al cerrar el ticket.");
        return;
      }
      setClosed({ ticket_id: data.ticket_id, total_cents: data.total_cents });
    });
  }

  if (closed) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-14 h-14 rounded-full bg-success/15 text-success mx-auto flex items-center justify-center mb-5">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="font-display italic text-3xl text-ink mb-3">Ticket #{closed.ticket_id} cerrado</h1>
        <p className="text-ink-2 mb-8">Total cobrado: <strong>{fmtCents(closed.total_cents, "MXN")}</strong></p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => { setClosed(null); setItems([]); setCoupon(""); setGiftCard(""); setTipCents(0); }} className="btn btn-primary">
            Nuevo ticket
          </button>
          <button onClick={() => router.push("/admin/agenda")} className="btn btn-ghost">Ir a agenda</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">POS</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Cerrar venta</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <section className="space-y-6">
          {/* Servicios */}
          <div className="card-paper p-5">
            <h2 className="font-display italic text-xl text-ink mb-3">Servicios</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {services.map((s) => (
                <button key={s.id} onClick={() => add("service", s)} className="btn btn-ghost flex-col py-3 px-2 text-left items-stretch">
                  <span className="text-xs font-display italic text-ink truncate">{s.name}</span>
                  <span className="text-xs text-ink-muted font-mono">{fmtCents(s.price_cents, "MXN")}</span>
                </button>
              ))}
            </div>
          </div>

          {products.length > 0 && (
            <div className="card-paper p-5">
              <h2 className="font-display italic text-xl text-ink mb-3">Productos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {products.map((p) => (
                  <button key={p.id} onClick={() => add("product", p)} disabled={p.stock <= 0} className="btn btn-ghost flex-col py-3 px-2 text-left items-stretch disabled:opacity-50">
                    <span className="text-xs font-display italic text-ink truncate">{p.name}</span>
                    <span className="text-xs text-ink-muted font-mono">{fmtCents(p.price_cents, "MXN")} · {p.stock}u</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Cart sticky */}
        <aside className="lg:sticky lg:top-4 self-start space-y-4">
          <div className="card-paper p-5">
            <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Barbero</label>
            <select value={barberId} onChange={(e) => setBarberId(Number(e.target.value))} className="input-boxed mb-4">
              {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            <h3 className="font-display italic text-lg text-ink mb-2">Ticket</h3>
            {items.length === 0 ? (
              <p className="text-sm text-ink-muted">Aún sin items.</p>
            ) : (
              <ul className="space-y-2 mb-4">
                {items.map((it, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex-1 truncate">{it.name}</span>
                    <span className="font-mono text-xs text-ink-muted">{fmtCents(it.unit * it.qty, "MXN")}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQty(i, it.qty - 1)} className="w-6 h-6 flex items-center justify-center rounded border border-line-medium"><Minus size={10} /></button>
                      <span className="w-6 text-center font-mono">{it.qty}</span>
                      <button onClick={() => setQty(i, it.qty + 1)} className="w-6 h-6 flex items-center justify-center rounded border border-line-medium"><Plus size={10} /></button>
                      <button onClick={() => setQty(i, 0)} className="text-danger ml-1"><Trash2 size={11} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-3 pt-3 border-t border-line-fine">
              <div>
                <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Cupón</label>
                <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="ELNAVA-XXXXXX" className="input-boxed font-mono text-xs" />
              </div>
              <div>
                <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Gift card</label>
                <input value={giftCard} onChange={(e) => setGiftCard(e.target.value.toUpperCase())} placeholder="GIFT-XXXXXXXX" className="input-boxed font-mono text-xs" />
              </div>
              <div>
                <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Propina (centavos)</label>
                <input type="number" min={0} value={tipCents} onChange={(e) => setTipCents(Number(e.target.value))} className="input-boxed font-mono" />
              </div>
              <div>
                <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Método de pago</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "cash" | "card" | "transfer")} className="input-boxed">
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                </select>
              </div>
            </div>

            <div className="border-t border-line-fine mt-4 pt-3 flex items-baseline justify-between">
              <span className="text-sm text-ink-2">Subtotal</span>
              <span className="font-display italic text-2xl text-ink tabular-nums">{fmtCents(subtotal, "MXN")}</span>
            </div>

            {error && <div className="text-danger text-sm bg-danger/8 border border-danger/30 rounded-[10px] px-3 py-2 mt-3">{error}</div>}

            <button onClick={close} disabled={pending || items.length === 0} className="btn btn-primary w-full justify-center mt-4 disabled:opacity-50">
              {pending ? <Loader2 size={14} className="animate-spin" /> : <ScrollText size={14} />}
              Cerrar ticket
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

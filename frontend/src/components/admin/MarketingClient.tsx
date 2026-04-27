"use client";

import { useState } from "react";
import { Send, Check, MessageCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Inactive {
  id: number;
  name: string;
  email: string;
  phone: string;
  last_visit: string | null;
  days_since: number | null;
}

interface Data {
  days_threshold: number;
  count: number;
  clients: Inactive[];
}

export function MarketingClient({ initialData }: { initialData: Data }) {
  const [selected, setSelected] = useState<Set<number>>(new Set(initialData.clients.map((c) => c.id)));
  const [discount, setDiscount] = useState(15);
  const [sent, setSent] = useState(false);

  const toggle = (id: number) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const send = () => {
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card-premium p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl">Clientes inactivos +{initialData.days_threshold} días</h2>
            <p className="text-xs text-text-2">{selected.size} de {initialData.clients.length} seleccionados</p>
          </div>
          <button
            onClick={() => setSelected(selected.size === initialData.clients.length ? new Set() : new Set(initialData.clients.map((c) => c.id)))}
            className="btn-ghost px-3 py-1.5 rounded-full text-xs"
          >
            {selected.size === initialData.clients.length ? "Deseleccionar todos" : "Seleccionar todos"}
          </button>
        </div>

        <div className="divide-y divide-border-subtle max-h-[520px] overflow-y-auto -mx-2">
          {initialData.clients.map((c) => {
            const checked = selected.has(c.id);
            return (
              <label
                key={c.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 cursor-pointer rounded-lg transition",
                  checked && "bg-accent/5",
                )}
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(c.id)} className="accent-[var(--accent)]" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-xs text-text-2">{c.email} · {c.phone}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-text-muted">{c.last_visit ? "Última visita" : "Sin visitas"}</div>
                  <div className="text-sm font-mono">
                    {c.days_since ? `${c.days_since} días` : "—"}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="card-premium p-6 h-fit sticky top-8">
        <div className="flex items-center gap-2 text-accent text-xs uppercase tracking-widest mb-3">
          <MessageCircle size={14} />
          Campaña WhatsApp
        </div>
        <h3 className="font-display text-2xl mb-3">Reactivar clientes</h3>

        <label className="block mb-4">
          <span className="text-xs text-text-muted uppercase tracking-wider">Cupón de descuento</span>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={discount}
              onChange={(e) => setDiscount(parseInt(e.target.value))}
              className="flex-1 accent-[var(--accent)]"
            />
            <div className="font-mono w-12 text-right text-accent">{discount}%</div>
          </div>
        </label>

        <div className="rounded-xl bg-bg-overlay/40 border border-border-medium p-4 text-sm whitespace-pre-line mb-4">
{`¡Hola {{nombre}}! 💈
Hace tiempo que no nos vemos en El Navajazo.

Vuelve esta semana con ${discount}% de descuento.
Código: NAVAJA-${discount}

Reserva: bit.ly/navajazo-vip`}
        </div>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full py-3 rounded-full bg-success/15 text-success border border-success/40 text-sm font-medium inline-flex items-center justify-center gap-2"
            >
              <Check size={16} /> Enviado a {selected.size} clientes
            </motion.div>
          ) : (
            <motion.button
              key="send"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={send}
              disabled={selected.size === 0}
              className="w-full btn-gold py-3 rounded-full text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={15} /> Enviar a {selected.size} clientes
            </motion.button>
          )}
        </AnimatePresence>

        <div className="mt-4 text-[11px] text-text-muted flex items-start gap-1.5">
          <Sparkles size={11} className="mt-0.5 shrink-0 text-accent" />
          Los cupones son únicos por cliente y trazables hasta el cobro.
        </div>
      </div>
    </div>
  );
}

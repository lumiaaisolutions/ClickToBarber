"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Check, AlertTriangle, Wallet, CreditCard, Landmark, Coins, Receipt } from "lucide-react";
import { fmtCents, cn } from "@/lib/utils";

interface Barber {
  id: number;
  name: string;
  commission_pct: number;
}

interface Preview {
  date: string;
  barber: { id: number; name: string; commission_pct: number };
  tickets_count: number;
  gross_cents: number;
  by_method: Record<string, number>;
  tips_cents: number;
  commission_cents: number;
  cash_expected_cents: number;
}

const METHOD_META: Record<string, { label: string; Icon: typeof Wallet }> = {
  cash:     { label: "Efectivo",       Icon: Wallet },
  card:     { label: "Tarjeta",        Icon: CreditCard },
  transfer: { label: "Transferencia",  Icon: Landmark },
  other:    { label: "Otro",           Icon: Coins },
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CashCloseClient({ barbers }: { barbers: Barber[] }) {
  const [barberId, setBarberId] = useState<number | null>(barbers[0]?.id ?? null);
  const [date, setDate] = useState<string>(todayIso());
  const [preview, setPreview] = useState<Preview | null>(null);
  const [declaredCents, setDeclaredCents] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!barberId) return;
    setLoading(true);
    setError(null);
    setSavedAt(null);
    const ctl = new AbortController();
    fetch(`/api/admin/cash-close?barber_id=${barberId}&date=${date}`, {
      signal: ctl.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Preview) => {
        setPreview(data);
        setDeclaredCents(data.cash_expected_cents);
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError("No se pudo cargar el preview.");
        setPreview(null);
      })
      .finally(() => setLoading(false));
    return () => ctl.abort();
  }, [barberId, date]);

  const variance = useMemo(() => {
    if (!preview) return 0;
    return declaredCents - preview.cash_expected_cents;
  }, [declaredCents, preview]);

  function save() {
    if (!preview || !barberId) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/admin/cash-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barber_id: barberId,
          date,
          declared_cash_cents: declaredCents,
          notes: notes.trim() || null,
        }),
      });
      if (res.ok) {
        setSavedAt(Date.now());
      } else {
        const data = await res.json().catch(() => null);
        setError((data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : null) ?? "No se pudo guardar.");
      }
    });
  }

  if (barbers.length === 0) {
    return (
      <div className="card-paper p-10 text-center text-ink-muted">
        Sin barberos activos. Da de alta personal en <span className="font-mono">/admin/staff</span> para registrar cierres.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 sm:gap-6">
      {/* Filtros */}
      <aside className="space-y-4">
        <div className="card-paper p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.28em] text-ink-muted block mb-1.5">Barbero</label>
            <select
              value={barberId ?? ""}
              onChange={(e) => setBarberId(Number(e.target.value))}
              className="input-boxed w-full"
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.commission_pct ? `· ${b.commission_pct}% comisión` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.28em] text-ink-muted block mb-1.5">Fecha</label>
            <input
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              className="input-boxed font-mono w-full"
            />
          </div>
        </div>
      </aside>

      {/* Preview + form */}
      <div className="space-y-5">
        {loading && (
          <div className="card-paper p-10 flex items-center justify-center text-ink-muted gap-2">
            <Loader2 size={16} className="animate-spin" /> Calculando preview…
          </div>
        )}

        {!loading && error && !preview && (
          <div className="card-paper p-6 border-danger/30 text-danger flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {!loading && preview && (
          <>
            {preview.tickets_count === 0 ? (
              <div className="card-paper p-10 text-center">
                <Receipt size={28} className="mx-auto text-ink-muted mb-2" />
                <div className="font-display text-xl">Sin tickets cerrados</div>
                <p className="text-sm text-ink-2 mt-1">
                  {preview.barber.name} no tuvo ventas el {preview.date}. No hay nada que reconciliar.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Kpi label="Tickets" value={String(preview.tickets_count)} />
                  <Kpi label="Bruto" value={fmtCents(preview.gross_cents)} highlight />
                  <Kpi label="Propinas" value={fmtCents(preview.tips_cents)} />
                  <Kpi label="Comisión" value={fmtCents(preview.commission_cents)} sub={`${preview.barber.commission_pct}%`} />
                </div>

                <div className="card-paper p-5 sm:p-6 space-y-4">
                  <h2 className="font-display italic text-xl">Por método de pago</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(preview.by_method).length === 0 && (
                      <div className="text-sm text-ink-muted col-span-2">Sin desglose disponible.</div>
                    )}
                    {Object.entries(preview.by_method).map(([method, cents]) => {
                      const meta = METHOD_META[method] ?? { label: method, Icon: Coins };
                      const Icon = meta.Icon;
                      return (
                        <div key={method} className="flex items-center justify-between border border-line-fine rounded-[10px] px-3 py-2">
                          <span className="flex items-center gap-2 text-sm">
                            <Icon size={14} className="text-accent" /> {meta.label}
                          </span>
                          <span className="font-mono tabular-nums text-sm">{fmtCents(cents)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="card-paper p-5 sm:p-6 space-y-5">
                  <header className="space-y-1">
                    <h2 className="font-display italic text-xl">Reconciliación de efectivo</h2>
                    <p className="text-xs text-ink-2">
                      Declara cuánto efectivo físico tienes en caja. Comparamos contra lo esperado y registramos la diferencia.
                    </p>
                  </header>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Efectivo esperado" value={fmtCents(preview.cash_expected_cents)} mono muted />
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.28em] text-ink-muted block mb-1.5">
                        Efectivo declarado
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={(declaredCents / 100).toFixed(2)}
                        onChange={(e) => setDeclaredCents(Math.max(0, Math.round(Number(e.target.value) * 100)))}
                        className="input-boxed font-mono w-full text-right"
                      />
                    </div>
                    <Field
                      label="Diferencia"
                      value={`${variance >= 0 ? "+" : ""}${fmtCents(variance)}`}
                      mono
                      tone={variance === 0 ? "ok" : variance > 0 ? "warn" : "danger"}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-[0.28em] text-ink-muted block mb-1.5">
                      Notas (opcional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Faltó cambio, propina entregada en mano, etc."
                      className="input-boxed w-full resize-none"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-danger flex items-center gap-1">
                      <AlertTriangle size={12} /> {error}
                    </p>
                  )}

                  <button
                    onClick={save}
                    disabled={pending}
                    className="btn btn-primary w-full justify-center disabled:opacity-50"
                  >
                    {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Cerrar caja del {preview.date}
                  </button>

                  {savedAt && (
                    <p className="text-xs text-success text-center">
                      Cierre registrado · diferencia {variance >= 0 ? "+" : ""}{fmtCents(variance)}.
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn("card-paper p-4", highlight && "border-primary/30 bg-primary/5")}>
      <div className="text-[10px] uppercase tracking-[0.28em] text-ink-muted">{label}</div>
      <div className={cn("font-display text-xl sm:text-2xl mt-1", highlight && "text-primary")}>{value}</div>
      {sub && <div className="text-[10px] text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function Field({
  label, value, mono, muted, tone,
}: { label: string; value: string; mono?: boolean; muted?: boolean; tone?: "ok" | "warn" | "danger" }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.28em] text-ink-muted block mb-1.5">{label}</label>
      <div
        className={cn(
          "input-boxed w-full text-right pointer-events-none",
          mono && "font-mono tabular-nums",
          muted && "text-ink-2",
          tone === "ok" && "text-success",
          tone === "warn" && "text-warning",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </div>
    </div>
  );
}

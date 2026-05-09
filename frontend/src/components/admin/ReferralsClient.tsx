"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Copy, Check, X, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Referral {
  id: number;
  code: string;
  status: "pending" | "signed_up" | "completed" | "expired";
  referrer: { id: number; name: string; email: string } | null;
  referred_email: string | null;
  referred: { id: number; name: string } | null;
  reward_referrer: number;
  reward_referred: number;
  expires_at: string | null;
  created_at: string | null;
}

const STATUS_LABEL: Record<Referral["status"], string> = {
  pending: "Pendiente",
  signed_up: "Registrado",
  completed: "Completado",
  expired: "Expirado",
};

const STATUS_TONE: Record<Referral["status"], string> = {
  pending: "bg-bg-vellum text-ink-2 border border-line-medium",
  signed_up: "bg-info/15 text-info border border-info/30",
  completed: "bg-success/15 text-success border border-success/30",
  expired: "bg-danger/15 text-danger border border-danger/30",
};

export function ReferralsClient({
  initial,
}: {
  initial: {
    kpis: { pending: number; signed_up: number; completed: number };
    referrals: Referral[];
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [referrerId, setReferrerId] = useState("");
  const [referredEmail, setReferredEmail] = useState("");
  const [issued, setIssued] = useState<{ code: string; share_url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function issue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referrer_user_id: Number(referrerId),
          referred_email: referredEmail || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.errors ? Object.values(data.errors as Record<string, string[]>)[0]?.[0] : null;
        setError(msg ?? data?.message ?? "Error al emitir referido.");
        return;
      }
      setIssued(data as { code: string; share_url: string });
      router.refresh();
    });
  }

  async function copyShareUrl() {
    if (!issued) return;
    await navigator.clipboard?.writeText(issued.share_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Crecimiento</div>
          <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Referidos</h1>
          <p className="text-ink-2 text-sm mt-3 max-w-xl leading-relaxed">
            Cada cliente puede invitar a otros. Cuando el referido reserva y
            completa su primera cita, ambos reciben la recompensa configurada.
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setIssued(null);
            setReferrerId("");
            setReferredEmail("");
            setError(null);
          }}
          className="btn btn-primary self-start sm:self-auto"
        >
          <Plus size={14} /> Emitir código
        </button>
      </header>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Kpi label="Pendientes" value={initial.kpis.pending} />
        <Kpi label="Registrados" value={initial.kpis.signed_up} />
        <Kpi label="Completados" value={initial.kpis.completed} />
      </div>

      {initial.referrals.length === 0 ? (
        <div className="card-paper p-10 text-center text-ink-2">
          Aún no se ha emitido ningún código. Pulsa <strong>Emitir código</strong>.
        </div>
      ) : (
        <div className="card-paper overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="text-[10px] uppercase tracking-imperial text-ink-muted">
                <tr className="border-b border-line-fine">
                  <th className="text-left px-4 sm:px-6 py-3">Código</th>
                  <th className="text-left px-3 py-3">Referidor</th>
                  <th className="text-left px-3 py-3">Referido</th>
                  <th className="text-left px-3 py-3">Estado</th>
                  <th className="text-left px-4 sm:px-6 py-3">Vence</th>
                </tr>
              </thead>
              <tbody>
                {initial.referrals.map((r) => (
                  <tr key={r.id} className="border-b border-line-fine last:border-0">
                    <td className="px-4 sm:px-6 py-3 font-mono">{r.code}</td>
                    <td className="px-3 py-3">{r.referrer?.name ?? "—"}</td>
                    <td className="px-3 py-3 text-ink-2">
                      {r.referred?.name ?? r.referred_email ?? "Abierto"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "text-[10px] tracking-imperial px-2 py-0.5 rounded-full inline-block",
                          STATUS_TONE[r.status],
                        )}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-xs text-ink-muted">
                      {r.expires_at ? new Date(r.expires_at).toLocaleDateString("es-MX") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/40 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowForm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-paper w-full max-w-md p-5 sm:p-8"
          >
            <header className="flex items-start justify-between mb-5 gap-3">
              <div>
                <div className="text-[10px] tracking-imperial text-accent-3 mb-1">
                  {issued ? "Listo" : "Nuevo código"}
                </div>
                <h2 className="font-display italic text-2xl text-ink">
                  {issued ? "Compártelo con tu cliente" : "Emitir código de referido"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-ink-muted hover:text-ink p-1"
              >
                <X size={18} />
              </button>
            </header>

            {issued ? (
              <div className="space-y-4">
                <div className="bg-bg-vellum rounded-[10px] p-4 text-center">
                  <div className="text-[10px] tracking-imperial text-ink-muted mb-2">
                    Código
                  </div>
                  <div className="font-display italic text-3xl text-primary tracking-wider">
                    {issued.code}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] tracking-imperial text-ink-muted mb-1.5">
                    Link para compartir
                  </div>
                  <div className="flex gap-2">
                    <code className="font-mono text-xs bg-bg-vellum border border-line-medium rounded-[8px] px-3 py-2 break-all flex-1">
                      {issued.share_url}
                    </code>
                    <button
                      onClick={copyShareUrl}
                      className="btn btn-ghost px-3 shrink-0"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="btn btn-primary w-full justify-center"
                >
                  Listo
                </button>
              </div>
            ) : (
              <form onSubmit={issue} className="space-y-4">
                <div>
                  <label className="text-[10px] tracking-imperial text-ink-muted mb-1.5 block">
                    ID del cliente referidor
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={referrerId}
                    onChange={(e) => setReferrerId(e.target.value)}
                    placeholder="42"
                    className="input-boxed font-mono"
                  />
                  <p className="text-[11px] text-ink-muted mt-1.5 leading-snug">
                    Busca el ID del cliente en la sección de Marketing → Clientes.
                  </p>
                </div>
                <div>
                  <label className="text-[10px] tracking-imperial text-ink-muted mb-1.5 block">
                    Email del referido (opcional)
                  </label>
                  <input
                    type="email"
                    value={referredEmail}
                    onChange={(e) => setReferredEmail(e.target.value)}
                    placeholder="opcional@correo.com"
                    className="input-boxed"
                  />
                  <p className="text-[11px] text-ink-muted mt-1.5 leading-snug">
                    Sin email, el código es abierto: cualquiera con el link puede usarlo.
                  </p>
                </div>

                {error && (
                  <div className="text-sm text-danger bg-danger/8 border border-danger/30 rounded-[10px] px-4 py-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="btn btn-primary w-full justify-center"
                >
                  {pending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  Emitir código
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-paper p-3 sm:p-5">
      <div className="text-[10px] tracking-imperial text-ink-muted">{label}</div>
      <div className="font-display italic text-2xl sm:text-3xl text-ink tabular-nums mt-1">
        {value}
      </div>
    </div>
  );
}

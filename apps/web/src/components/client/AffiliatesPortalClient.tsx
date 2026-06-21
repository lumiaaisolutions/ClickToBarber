"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Loader2, Sparkles, Copy, Check, AlertTriangle, LogOut,
  TrendingUp, Users, Wallet, CreditCard, ExternalLink,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { fmtCents } from "@/lib/utils";

const STORAGE_KEY = "lumia_affiliate_code";

interface DashboardData {
  affiliate: {
    name: string;
    email: string;
    code: string;
    commission_pct: number;
    is_active: boolean;
    stripe_payouts_enabled: boolean;
    stripe_connected: boolean;
  };
  stats: {
    tenants_referred: number;
    commission_paid_cents: number;
    mrr_referred_cents: number;
  };
  share_url: string;
  referrals: Array<{
    tenant_name: string;
    mrr_cents_at_signup: number;
    total_commission_paid_cents: number;
    signed_up_at: string;
  }>;
}

export function AffiliatesPortalClient() {
  const [code, setCode] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  // Recordamos el último code en localStorage (queda en el navegador del afiliado).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const params = new URLSearchParams(window.location.search);
    if (saved) {
      setCode(saved);
      load(saved);
      // Si volvemos del onboarding de Stripe, refresca el status.
      if (params.get("connect") === "ok" || params.get("connect") === "refresh") {
        fetch("/api/public/affiliates/connect/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: saved }),
        }).then(() => load(saved));
        // Limpia el query param sin recargar.
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  function startConnect() {
    if (!data) return;
    startTransition(async () => {
      const res = await fetch("/api/public/affiliates/connect/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: data.affiliate.code }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.url) {
          window.location.href = json.url as string;
          return;
        }
      }
      setError("No se pudo iniciar la conexión con Stripe.");
    });
  }

  function load(c: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/public/affiliates/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      });
      if (res.ok) {
        const json = (await res.json()) as DashboardData;
        setData(json);
        if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, c);
      } else if (res.status === 404) {
        setError("Código no encontrado.");
        setData(null);
      } else if (res.status === 403) {
        setError("Tu cuenta de afiliado está pausada. Contáctanos.");
        setData(null);
      } else if (res.status === 422) {
        setError("Formato inválido — debe empezar con AFF-.");
      } else {
        setError("No pudimos cargar el dashboard.");
      }
    });
  }

  function logout() {
    setData(null);
    setCode("");
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    load(code.trim().toUpperCase());
  }

  function copyShare() {
    if (!data?.share_url) return;
    navigator.clipboard?.writeText(data.share_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-bg-canvas px-4 sm:px-6 py-10 sm:py-16">
        <div className="max-w-md mx-auto">
          <Logo className="h-9 text-primary mb-10" />
          <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Afiliados</div>
          <h1 className="font-display italic text-3xl sm:text-4xl text-ink mb-3">
            Entra a tu dashboard
          </h1>
          <p className="text-ink-2 mb-8 leading-relaxed">
            Tu código privado lo recibiste por email cuando te registraste.
            Empieza con <span className="font-mono">AFF-</span>.
          </p>

          <form onSubmit={submit} className="card-paper p-6 sm:p-7 space-y-4">
            <div>
              <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">
                Código de afiliado
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="AFF-XXXXXX"
                className="input-boxed font-mono w-full"
              />
            </div>
            {error && (
              <p className="text-sm text-danger flex items-center gap-1">
                <AlertTriangle size={13} /> {error}
              </p>
            )}
            <button type="submit" disabled={pending} className="btn btn-primary w-full justify-center disabled:opacity-50">
              {pending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Entrar
            </button>
          </form>

          <div className="card-paper p-5 mt-5 text-center">
            <p className="text-sm text-ink-2 mb-3">¿Aún no tienes código?</p>
            <Link href="/affiliates/signup" className="btn btn-ghost justify-center w-full">
              Registrarme como afiliado
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-canvas px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-start justify-between gap-4 mb-8">
          <div>
            <Logo className="h-8 text-primary mb-6" />
            <div className="text-[10px] tracking-imperial text-accent-3 mb-2">Mi dashboard</div>
            <h1 className="font-display italic text-3xl sm:text-4xl text-ink">
              Hola, {data.affiliate.name.split(" ")[0]}
            </h1>
            <p className="text-sm text-ink-muted mt-1">{data.affiliate.email}</p>
          </div>
          <button onClick={logout} className="text-xs text-ink-muted hover:text-danger inline-flex items-center gap-1.5 mt-1">
            <LogOut size={13} /> Salir
          </button>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Kpi
            icon={<Users size={14} className="text-accent" />}
            label="Barberías referidas"
            value={String(data.stats.tenants_referred)}
          />
          <Kpi
            icon={<TrendingUp size={14} className="text-accent" />}
            label="MRR generado"
            value={fmtCents(data.stats.mrr_referred_cents)}
            sub={`comisión ${data.affiliate.commission_pct}%`}
          />
          <Kpi
            icon={<Wallet size={14} className="text-accent" />}
            label="Comisión pagada"
            value={fmtCents(data.stats.commission_paid_cents)}
          />
        </div>

        {/* Stripe Connect status */}
        {!data.affiliate.stripe_payouts_enabled && (
          <div className="card-paper p-5 sm:p-6 mb-6 border-warning/30 bg-warning/5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <CreditCard size={18} className="text-warning shrink-0 mt-0.5" />
                <div>
                  <div className="font-display italic text-lg text-ink">
                    {data.affiliate.stripe_connected ? "Conexión Stripe pendiente" : "Conecta tu cuenta para cobrar"}
                  </div>
                  <p className="text-sm text-ink-2 leading-relaxed mt-0.5">
                    {data.affiliate.stripe_connected
                      ? "Termina el onboarding de Stripe para que podamos pagarte automáticamente cada mes."
                      : "Recibe tus comisiones directo a tu cuenta vía Stripe Connect Express. Tarda 5 minutos."}
                  </p>
                </div>
              </div>
              <button onClick={startConnect} disabled={pending} className="btn btn-primary justify-center sm:min-w-[200px]">
                {pending ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                {data.affiliate.stripe_connected ? "Continuar onboarding" : "Conectar Stripe"}
              </button>
            </div>
          </div>
        )}
        {data.affiliate.stripe_payouts_enabled && (
          <div className="card-paper p-3 mb-6 border-success/30 bg-success/5 text-success text-sm flex items-center gap-2">
            <Check size={14} /> Stripe conectado. Tus comisiones se pagan automáticamente cada mes.
          </div>
        )}

        {/* Share link */}
        <div className="card-paper p-5 sm:p-6 mb-6">
          <div className="text-[10px] tracking-imperial text-ink-muted mb-2">Tu link único</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 font-mono text-sm bg-bg-vellum border border-line-medium rounded-[10px] px-3 py-2 break-all select-all">
              {data.share_url}
            </code>
            <button onClick={copyShare} className="btn btn-ghost justify-center sm:min-w-[120px]">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="text-[11px] text-ink-muted mt-2 leading-relaxed">
            Compártelo con barberías. Cuando se registren con este link,
            quedarán asociadas a tu cuenta.
          </p>
        </div>

        {/* Referrals table */}
        <section>
          <h2 className="font-display italic text-xl text-ink mb-3">Tus referidos</h2>
          {data.referrals.length === 0 ? (
            <div className="card-paper p-8 text-center text-ink-muted text-sm">
              Aún no tienes referidos activos. Comparte tu link y empezarás a
              ver datos aquí.
            </div>
          ) : (
            <div className="card-paper overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-bg-vellum text-[10px] tracking-imperial text-ink-muted">
                  <tr>
                    <th className="text-left px-4 py-2 font-normal">Barbería</th>
                    <th className="text-right px-4 py-2 font-normal">MRR</th>
                    <th className="text-right px-4 py-2 font-normal">Comisión</th>
                    <th className="text-right px-4 py-2 font-normal">Desde</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referrals.map((r, i) => (
                    <tr key={i} className="border-t border-line-fine">
                      <td className="px-4 py-3">{r.tenant_name}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{fmtCents(r.mrr_cents_at_signup)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-success">{fmtCents(r.total_commission_paid_cents)}</td>
                      <td className="px-4 py-3 text-right text-ink-muted">
                        {new Date(r.signed_up_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-12 pt-6 border-t border-line-fine text-xs text-ink-muted text-center">
          <p>
            Pagos mensuales por transferencia los primeros 5 días hábiles.
            Cualquier pregunta:{" "}
            <a href="mailto:afiliados@lumiaaisolutions.com" className="text-primary">afiliados@lumiaaisolutions.com</a>
          </p>
        </footer>
      </div>
    </main>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card-paper p-5">
      <div className="flex items-center gap-2 text-[10px] tracking-imperial text-ink-muted mb-2">
        {icon} {label}
      </div>
      <div className="font-display text-2xl text-ink">{value}</div>
      {sub && <div className="text-[10px] text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );
}

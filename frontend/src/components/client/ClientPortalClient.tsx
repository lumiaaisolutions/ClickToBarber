"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Sparkles, Calendar, Mail, Share2, Trash2, Download, ShieldAlert } from "lucide-react";
import { Logo } from "@/components/Logo";
import { fmtDateTime } from "@/lib/utils";
import { MembershipsSection } from "./MembershipsSection";

interface PortalData {
  client: { id: number; name: string; email: string };
  appointments: Array<{
    id: number;
    starts_at: string;
    service: string | null;
    barber: string | null;
    status: string;
  }>;
  rewards: Array<{
    code: string;
    reward_type: string;
    reward_value: number;
    reward_label: string | null;
    expires_at: string | null;
  }>;
  visits_credited: number;
  referral_code: string | null;
}

type Step = "request" | "consume" | "loaded" | "deleted";

export function ClientPortalClient({
  initialToken,
  initialSlug,
  membershipFlash = null,
}: {
  initialToken: string | null;
  initialSlug: string | null;
  membershipFlash?: "success" | "cancelled" | null;
}) {
  const [step, setStep] = useState<Step>(initialToken ? "consume" : "request");
  const [token, setToken] = useState(initialToken ?? "");
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState(initialSlug ?? "");
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (initialToken) {
      consume(initialToken);
    }
  }, [initialToken]);

  async function requestLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/public/me/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tenant_slug: slug }),
      });
      if (!res.ok) {
        setError("Error al solicitar el enlace.");
        return;
      }
      setError("Si tu email está registrado, recibirás un correo en breve.");
    });
  }

  async function consume(t: string) {
    setError(null);
    setStep("consume");
    const res = await fetch("/api/public/me/consume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: t }),
    });
    if (!res.ok) {
      setError("El enlace expiró o no es válido.");
      setStep("request");
      return;
    }
    const d = (await res.json()) as PortalData;
    setData(d);
    setStep("loaded");
  }

  async function exportData() {
    const res = await fetch("/api/public/me/data-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      setError("No se pudo generar el export.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lumia-mis-datos.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    if (!confirm("Esto anonimiza tu cuenta y borra tus datos personales. ¿Confirmas?")) return;
    startTransition(async () => {
      const res = await fetch("/api/public/me/data-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, confirm: "DELETE" }),
      });
      if (!res.ok) {
        setError("No se pudo borrar la cuenta.");
        return;
      }
      setStep("deleted");
    });
  }

  if (step === "deleted") {
    return (
      <main className="min-h-screen bg-bg-canvas flex flex-col items-center justify-center px-6 py-16 text-center">
        <Logo className="mx-auto h-9 text-primary mb-10" />
        <h1 className="font-display italic text-3xl sm:text-4xl text-ink mb-4">Listo.</h1>
        <p className="text-ink-2 max-w-md">
          Tu cuenta y datos personales fueron anonimizados. Si vuelves a reservar,
          recreamos los datos mínimos necesarios.
        </p>
      </main>
    );
  }

  if (step !== "loaded" || !data) {
    return (
      <main className="min-h-screen bg-bg-canvas flex flex-col items-center justify-center px-4 sm:px-6 py-10">
        <div className="max-w-md w-full">
          <Logo className="mx-auto h-9 text-primary mb-10" />
          <div className="text-[10px] tracking-imperial text-accent-3 text-center mb-3">Mi cuenta</div>
          <h1 className="font-display italic text-3xl sm:text-4xl text-ink text-center mb-3">
            Recibe tu enlace seguro
          </h1>
          <p className="text-ink-2 text-center mb-8 leading-relaxed">
            Te mandaremos un correo con un enlace para entrar — sin contraseñas, dura 30 minutos.
          </p>

          <form onSubmit={requestLogin} className="card-paper p-5 sm:p-7 space-y-4">
            <div>
              <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-boxed"
              />
            </div>
            <div>
              <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">
                Slug de la barbería
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="ej. el-navajazo"
                className="input-boxed font-mono text-sm"
              />
            </div>
            {error && (
              <div className="text-sm bg-bg-vellum border border-line-medium rounded-[10px] px-4 py-3 text-ink-2">
                {error}
              </div>
            )}
            <button type="submit" disabled={pending} className="btn btn-primary w-full justify-center">
              {pending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              Enviarme el enlace
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-canvas px-4 sm:px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <Logo className="h-8 text-primary mb-8" />
        <header className="mb-8">
          <div className="text-[10px] tracking-imperial text-accent-3 mb-2">Mi cuenta</div>
          <h1 className="font-display italic text-3xl sm:text-4xl text-ink">
            Hola, {data.client.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-ink-muted mt-1">{data.client.email}</p>
        </header>

        {/* Loyalty resumen */}
        <div className="card-paper p-5 sm:p-6 mb-6 grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] tracking-imperial text-ink-muted">Visitas acreditadas</div>
            <div className="font-display italic text-3xl text-ink mt-1">{data.visits_credited}</div>
          </div>
          {data.referral_code && (
            <div>
              <div className="text-[10px] tracking-imperial text-ink-muted">Tu código de referido</div>
              <div className="font-mono text-lg text-primary mt-1 flex items-center gap-2">
                {data.referral_code}
                <button
                  onClick={() => navigator.clipboard?.writeText(data.referral_code!)}
                  className="text-ink-muted hover:text-primary"
                  aria-label="Copiar"
                >
                  <Share2 size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recompensas */}
        {data.rewards.length > 0 && (
          <section className="mb-6">
            <h2 className="font-display italic text-xl text-ink mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-accent-3" /> Recompensas activas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.rewards.map((r) => (
                <div key={r.code} className="card-paper p-4">
                  <div className="font-mono text-lg text-primary">{r.code}</div>
                  <div className="text-sm text-ink-2 mt-1">
                    {r.reward_type === "free_service" ? "Servicio gratis" : `${r.reward_value}% off`}
                  </div>
                  {r.expires_at && (
                    <div className="text-[11px] text-ink-muted mt-2">
                      Vence: {new Date(r.expires_at).toLocaleDateString("es-MX")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Memberships */}
        <MembershipsSection token={token} flash={membershipFlash} />

        {/* Citas */}
        <section className="mb-10">
          <h2 className="font-display italic text-xl text-ink mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-accent-3" /> Mis citas
          </h2>
          {data.appointments.length === 0 ? (
            <div className="text-sm text-ink-muted">Aún no tienes citas registradas.</div>
          ) : (
            <ul className="space-y-2">
              {data.appointments.map((a) => (
                <li key={a.id} className="card-paper p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-display italic text-ink">{a.service}</div>
                    <div className="text-xs text-ink-muted">{a.barber}</div>
                  </div>
                  <div className="text-sm text-ink-2 font-mono">
                    {fmtDateTime(a.starts_at)}
                  </div>
                  <span className="text-[10px] tracking-imperial bg-bg-vellum px-2 py-0.5 rounded-full text-ink-2 self-start sm:self-auto">
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr className="hairline mb-8" />

        {/* GDPR */}
        <section>
          <h2 className="font-display italic text-xl text-ink mb-3 flex items-center gap-2">
            <ShieldAlert size={16} className="text-accent-3" /> Mis datos
          </h2>
          <p className="text-sm text-ink-2 mb-4 leading-relaxed">
            Bajo GDPR / LFPDPPP puedes descargar todos los datos que tenemos sobre ti
            o pedir la anonimización de tu cuenta.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={exportData} className="btn btn-ghost text-sm">
              <Download size={14} /> Descargar mis datos
            </button>
            <button
              onClick={deleteAccount}
              disabled={pending}
              className="btn btn-ghost text-sm text-danger hover:!border-danger disabled:opacity-50"
            >
              <Trash2 size={14} /> Eliminar mi cuenta
            </button>
          </div>
          {error && (
            <div className="text-sm bg-danger/8 border border-danger/30 rounded-[10px] px-4 py-3 text-danger mt-4">
              {error}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

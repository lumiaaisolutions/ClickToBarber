import { CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react";

interface Check { ok: boolean | "skipped"; detail?: string; error?: string; reason?: string; latency_ms?: number; }
interface Health { ok: boolean; service: string; version: string; env: string; time: string; checks: Record<string, Check>; }

async function loadHealth(): Promise<Health | null> {
  const apiBase = process.env.BARBERPRO_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";
  try {
    const res = await fetch(`${apiBase}/up/deep`, { cache: "no-store" });
    return (await res.json()) as Health;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";
export const metadata = { title: "Status — LUMIA" };

export default async function StatusPage() {
  const h = await loadHealth();

  if (!h) {
    return (
      <main className="min-h-screen bg-bg-canvas flex flex-col items-center justify-center px-6 py-16 text-center">
        <XCircle size={48} className="text-danger mx-auto mb-5" />
        <h1 className="font-display italic text-3xl text-ink mb-3">Sistema no responde</h1>
        <p className="text-ink-2">No pudimos contactar la API. Si esto persiste, escribe a hola@lumiaaisolutions.com.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-canvas px-4 sm:px-6 py-12 sm:py-20">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-10">
          <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Estado del servicio</div>
          <h1 className={`font-display italic text-4xl sm:text-5xl mb-3 ${h.ok ? "text-success" : "text-warning"}`}>
            {h.ok ? "Todo operativo" : "Servicio degradado"}
          </h1>
          <p className="text-ink-2 text-sm">
            {h.service} · {h.env} · {h.version} · actualizado {new Date(h.time).toLocaleString("es-MX")}
          </p>
        </header>

        <ul className="space-y-3">
          {Object.entries(h.checks).map(([key, check]) => {
            const ok = check.ok === true;
            const skipped = check.ok === "skipped";
            return (
              <li key={key} className="card-paper p-4 flex items-center gap-4">
                {ok && <CheckCircle2 size={20} className="text-success shrink-0" />}
                {!ok && !skipped && <XCircle size={20} className="text-danger shrink-0" />}
                {skipped && <Activity size={20} className="text-ink-muted shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-display italic text-ink uppercase text-sm">{key}</div>
                  <div className="text-xs text-ink-2 truncate">
                    {ok && (check.detail ?? `${check.latency_ms ?? "?"} ms`)}
                    {skipped && (check.reason ?? "no configurado")}
                    {!ok && !skipped && (check.error ?? "error")}
                  </div>
                </div>
                <span className={`text-[10px] tracking-imperial px-2 py-0.5 rounded-full ${
                  ok ? "bg-success/15 text-success" :
                  skipped ? "bg-bg-vellum text-ink-muted" :
                  "bg-danger/15 text-danger"
                }`}>
                  {ok ? "OK" : skipped ? "skipped" : "down"}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-ink-muted text-center mt-8">
          Status en tiempo real. Para incidentes históricos, ver <a href="https://twitter.com/lumiaapp" className="text-primary">@lumiaapp</a>.
        </p>
      </div>
    </main>
  );
}

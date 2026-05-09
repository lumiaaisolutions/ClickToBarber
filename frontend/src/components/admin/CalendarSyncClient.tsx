"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarSync, Link2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Status {
  configured: boolean;
  connected: boolean;
  account: string | null;
  last_synced_at: string | null;
}

export function CalendarSyncClient({
  initial,
  flash,
}: {
  initial: Status;
  flash: { connected: boolean; error: string | null };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function startGoogle() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/calendar/google/start", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.authorize_url) {
        setError(
          data?.error === "google_not_configured"
            ? "Google Calendar todavía no está configurado en el servidor (faltan credenciales OAuth)."
            : data?.message ?? "No se pudo iniciar la conexión.",
        );
        return;
      }
      window.location.href = data.authorize_url;
    });
  }

  function disconnect() {
    if (!confirm("¿Desvincular tu Google Calendar?")) return;
    startTransition(async () => {
      await fetch("/api/admin/calendar/disconnect", { method: "POST" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-2xl">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Integraciones</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">
          Sincronización de calendario
        </h1>
        <p className="text-ink-2 text-sm mt-3 leading-relaxed">
          Conecta tu Google Calendar para que tus citas se reflejen en tu
          calendario personal. También puedes suscribir el feed iCal de cada
          barbero desde Apple/Outlook.
        </p>
      </header>

      {flash.connected && (
        <div className="p-4 rounded-[12px] bg-success/8 border border-success/30 text-success text-sm flex items-center gap-3">
          <CheckCircle2 size={16} className="shrink-0" />
          Tu Google Calendar quedó conectado correctamente.
        </div>
      )}

      {flash.error && (
        <div className="p-4 rounded-[12px] bg-danger/8 border border-danger/30 text-danger text-sm flex items-center gap-3">
          <AlertTriangle size={16} className="shrink-0" />
          {flash.error === "state_expired"
            ? "El enlace de autorización expiró. Vuelve a intentarlo."
            : `Error en la conexión: ${flash.error}`}
        </div>
      )}

      <div className="card-paper p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-bg-vellum border border-line-medium flex items-center justify-center text-primary shrink-0">
              <CalendarSync size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="font-display italic text-xl sm:text-2xl text-ink">Google Calendar</h2>
              {initial.connected ? (
                <p className="text-sm text-ink-2 mt-1 break-all">
                  Conectado como <strong>{initial.account ?? "(usuario)"}</strong>
                </p>
              ) : (
                <p className="text-sm text-ink-2 mt-1">
                  Cada cita confirmada se publicará automáticamente.
                </p>
              )}
            </div>
          </div>

          {initial.connected ? (
            <button
              onClick={disconnect}
              disabled={pending}
              className="btn btn-ghost text-danger hover:!border-danger disabled:opacity-50 self-start sm:self-auto"
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : null}
              Desconectar
            </button>
          ) : (
            <button
              onClick={startGoogle}
              disabled={pending || !initial.configured}
              className="btn btn-primary disabled:opacity-50 self-start sm:self-auto"
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
              Conectar
            </button>
          )}
        </div>

        {!initial.configured && (
          <div className="mt-5 p-4 rounded-[10px] bg-warning/8 border border-warning/30 text-sm text-warning leading-relaxed">
            <strong>OAuth no configurado en el servidor.</strong> Para activar la
            integración, define <code className="font-mono">GOOGLE_CLIENT_ID</code> y{" "}
            <code className="font-mono">GOOGLE_CLIENT_SECRET</code> en el backend
            y registra el redirect URI{" "}
            <code className="font-mono break-all">
              {`${typeof window !== "undefined" ? window.location.origin : ""}`}/api/admin/calendar/google/callback
            </code>{" "}
            en la consola de Google Cloud.
          </div>
        )}

        {error && (
          <div className="mt-5 p-3 rounded-[10px] bg-danger/8 border border-danger/30 text-danger text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="card-paper p-5 sm:p-7">
        <h2 className="font-display italic text-xl sm:text-2xl text-ink mb-3">
          Feed iCal por barbero
        </h2>
        <p className="text-sm text-ink-2 mb-4 leading-relaxed">
          Cada barbero tiene un feed iCal único en{" "}
          <code className="font-mono">/api/ical/barber/&lt;token&gt;.ics</code>.
          Los tokens se generan al crear el barbero y se pueden rotar desde la
          ficha individual en <strong>Personal</strong>.
        </p>
        <p className="text-xs text-ink-muted">
          Suscripción en Apple Calendar: <em>Archivo → Nueva suscripción de calendario</em>.
          En Google Calendar: <em>+ Otros calendarios → Desde URL</em>.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff, Copy, Check, Loader2, Download } from "lucide-react";

interface InitialStatus {
  enabled: boolean;
  pending_confirmation: boolean;
  confirmed_at: string | null;
}

interface SetupPayload {
  secret: string;
  otpauth_uri: string;
  recovery_codes: string[];
}

type View = "idle" | "setup" | "confirmed";

export function TwoFactorClient({ initial }: { initial: InitialStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<View>(initial.enabled ? "confirmed" : "idle");
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [disablePassword, setDisablePassword] = useState("");
  const [copied, setCopied] = useState<"secret" | "uri" | null>(null);

  async function startSetup() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/security/2fa/setup", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "No se pudo iniciar el setup.");
        return;
      }
      setSetup(data as SetupPayload);
      setView("setup");
    });
  }

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/security/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          data?.error === "invalid_code"
            ? "Código incorrecto. Verifica que tu reloj esté en hora."
            : data?.error ?? "Error al confirmar.",
        );
        return;
      }
      setView("confirmed");
      router.refresh();
    });
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/security/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          data?.error === "invalid_password"
            ? "Contraseña incorrecta."
            : "Error al desactivar.",
        );
        return;
      }
      setSetup(null);
      setDisablePassword("");
      setView("idle");
      router.refresh();
    });
  }

  async function copyText(value: string, kind: "secret" | "uri") {
    await navigator.clipboard?.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  function downloadCodes() {
    if (!setup) return;
    const blob = new Blob([setup.recovery_codes.join("\n") + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lumia-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Seguridad</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">
          Verificación en dos pasos
        </h1>
        <p className="text-ink-2 text-sm mt-3 max-w-xl leading-relaxed">
          Suma una capa extra de protección a tu cuenta. Cada vez que inicies
          sesión te pediremos un código de 6 dígitos generado por tu app de
          autenticación.
        </p>
      </header>

      {view === "confirmed" && (
        <div className="card-paper p-5 sm:p-7 space-y-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-success/15 flex items-center justify-center text-success shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="font-display italic text-xl sm:text-2xl text-ink">
                2FA activo
              </h2>
              <p className="text-sm text-ink-2 mt-1">
                Tu cuenta requiere un código de 6 dígitos al iniciar sesión.
              </p>
            </div>
          </div>

          <hr className="hairline" />

          <form onSubmit={disable} className="space-y-3">
            <div>
              <label className="text-[10px] tracking-imperial text-ink-2 mb-2 block">
                Para desactivar 2FA, confirma con tu contraseña
              </label>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="input-boxed"
                required
              />
            </div>
            {error && (
              <div className="text-sm text-danger bg-danger/8 border border-danger/30 rounded-[10px] px-4 py-3">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={pending || !disablePassword}
              className="btn btn-ghost text-danger hover:!border-danger disabled:opacity-50"
            >
              <ShieldOff size={14} /> Desactivar 2FA
            </button>
          </form>
        </div>
      )}

      {view === "idle" && (
        <div className="card-paper p-5 sm:p-7 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 mx-auto sm:mx-0 rounded-full bg-bg-vellum border border-line-medium flex items-center justify-center text-ink-muted shrink-0">
              <ShieldOff size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display italic text-xl sm:text-2xl text-ink">
                2FA no activado
              </h2>
              <p className="text-sm text-ink-2 mt-1 leading-relaxed">
                Cuando lo actives, te pediremos el código cada vez que inicies
                sesión desde un nuevo dispositivo.
              </p>
            </div>
            <button
              onClick={startSetup}
              disabled={pending}
              className="btn btn-primary mx-auto sm:mx-0 w-full sm:w-auto justify-center disabled:opacity-50"
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              Activar
            </button>
          </div>
          {error && (
            <div className="text-sm text-danger bg-danger/8 border border-danger/30 rounded-[10px] px-4 py-3 mt-5">
              {error}
            </div>
          )}
        </div>
      )}

      {view === "setup" && setup && (
        <div className="card-paper p-5 sm:p-8 space-y-6">
          <div>
            <div className="text-[10px] tracking-imperial text-accent-3 mb-2">Paso 1 de 3</div>
            <h2 className="font-display italic text-2xl text-ink">
              Escanea con tu app de autenticación
            </h2>
            <p className="text-sm text-ink-2 mt-2">
              Recomendamos <strong>1Password</strong>, <strong>Authy</strong> o{" "}
              <strong>Google Authenticator</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-5 sm:gap-7 items-center">
            <div className="bg-white p-3 rounded-[12px] border border-line-medium shrink-0 mx-auto">
              {/* QR generado por servicio externo gratuito; el otpauth URI no es secreto en sí (lo es el secret embebido), pero viaja una sola vez por TLS al iniciar setup. */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(setup.otpauth_uri)}`}
                alt="QR para autenticación"
                width={180}
                height={180}
                className="block"
              />
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] tracking-imperial text-ink-muted mb-1.5">
                  ¿No puedes escanear? Ingresa este código manualmente:
                </div>
                <div className="flex gap-2">
                  <code className="font-mono text-sm bg-bg-vellum border border-line-medium rounded-[8px] px-3 py-2 break-all flex-1 select-all">
                    {setup.secret}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyText(setup.secret, "secret")}
                    className="btn btn-ghost px-3 shrink-0"
                  >
                    {copied === "secret" ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <hr className="hairline" />

          <div>
            <div className="text-[10px] tracking-imperial text-accent-3 mb-2">Paso 2 de 3</div>
            <h2 className="font-display italic text-2xl text-ink">
              Guarda tus códigos de recuperación
            </h2>
            <p className="text-sm text-ink-2 mt-2">
              Si pierdes tu teléfono, estos códigos te dejan entrar. Cada uno
              vale para un solo uso. <strong>Guárdalos en un lugar seguro</strong>.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {setup.recovery_codes.map((c) => (
                <code
                  key={c}
                  className="font-mono text-xs bg-bg-vellum border border-line-medium rounded-[8px] px-2 py-2 text-center"
                >
                  {c}
                </code>
              ))}
            </div>
            <button
              type="button"
              onClick={downloadCodes}
              className="btn btn-ghost mt-4 text-xs"
            >
              <Download size={12} /> Descargar como .txt
            </button>
          </div>

          <hr className="hairline" />

          <form onSubmit={confirmCode} className="space-y-4">
            <div>
              <div className="text-[10px] tracking-imperial text-accent-3 mb-2">
                Paso 3 de 3
              </div>
              <h2 className="font-display italic text-2xl text-ink">
                Confirma con tu primer código
              </h2>
              <p className="text-sm text-ink-2 mt-2">
                Ingresa el código de 6 dígitos que ves ahora en tu app.
              </p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="input-boxed font-mono text-center text-2xl tracking-[0.5em]"
            />
            {error && (
              <div className="text-sm text-danger bg-danger/8 border border-danger/30 rounded-[10px] px-4 py-3">
                {error}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setView("idle");
                  setSetup(null);
                  setCode("");
                  setError(null);
                }}
                className="btn btn-ghost w-full sm:w-auto justify-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending || code.length !== 6}
                className="btn btn-primary w-full sm:w-auto justify-center disabled:opacity-50"
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                Activar 2FA
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";

type Step = "credentials" | "twofa";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("admin@elnavajazo.test");
  const [password, setPassword] = useState("password");
  const [code, setCode] = useState("");
  const [loginToken, setLoginToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as
      | { errors?: Record<string, string[]>; message?: string; requires_2fa?: boolean; login_token?: string; user?: { first_login_at?: string | null } }
      | null;

    if (!res.ok) {
      const firstError = data?.errors ? Object.values(data.errors)[0]?.[0] : null;
      setError(firstError ?? data?.message ?? "Credenciales inválidas.");
      return;
    }

    if (data?.requires_2fa && data.login_token) {
      setLoginToken(data.login_token);
      setStep("twofa");
      return;
    }

    redirectAfterLogin(data?.user?.first_login_at);
  }

  async function on2faSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!loginToken) {
      setError("Tu sesión expiró. Vuelve a iniciar sesión.");
      setStep("credentials");
      return;
    }

    const res = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login_token: loginToken, code }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as
      | { error?: string; user?: { first_login_at?: string | null } }
      | null;

    if (!res.ok) {
      const reason = data?.error;
      if (reason === "login_token_invalid") {
        setError("La sesión expiró. Vuelve a iniciar sesión.");
        setStep("credentials");
        setLoginToken(null);
        return;
      }
      setError("Código inválido. Inténtalo de nuevo.");
      return;
    }

    redirectAfterLogin(data?.user?.first_login_at);
  }

  function redirectAfterLogin(firstLoginAt: string | null | undefined) {
    const target = firstLoginAt == null ? "/admin/onboarding" : "/admin";
    startTransition(() => {
      router.replace(target);
      router.refresh();
    });
  }

  if (step === "twofa") {
    return (
      <form onSubmit={on2faSubmit} className="space-y-5">
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-[12px] bg-bg-vellum border border-line-medium">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="text-sm text-ink-2 leading-snug">
            Tu cuenta está protegida con verificación en dos pasos. Abre tu app
            de autenticación e ingresa el código de 6 dígitos.
          </div>
        </div>

        <div>
          <label className="text-[10px] tracking-imperial text-ink-2 mb-2 block">
            Código de 6 dígitos · o recovery code
          </label>
          <input
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="input-boxed font-mono text-center text-xl tracking-[0.5em]"
          />
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
          {pending ? <Loader2 size={14} className="animate-spin" /> : null}
          Verificar
        </button>

        <button
          type="button"
          onClick={() => {
            setStep("credentials");
            setLoginToken(null);
            setCode("");
            setError(null);
          }}
          className="text-xs text-ink-muted hover-spread block mx-auto"
        >
          ← Usar otra cuenta
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onCredentialsSubmit} className="space-y-5">
      <div>
        <label className="text-[10px] tracking-imperial text-ink-2 mb-2 block">Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-boxed"
        />
      </div>

      <div>
        <label className="text-[10px] tracking-imperial text-ink-2 mb-2 block">Contraseña</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-boxed"
        />
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
        {pending ? "Entrando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}

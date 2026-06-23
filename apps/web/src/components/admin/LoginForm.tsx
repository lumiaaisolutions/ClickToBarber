"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock } from "lucide-react";
import { notify } from "@/lib/notify";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  async function onCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as
      | { errors?: Record<string, string[]>; message?: string; user?: { first_login_at?: string | null } }
      | null;

    if (!res.ok) {
      const firstError = data?.errors ? Object.values(data.errors)[0]?.[0] : null;
      notify.error("No pudimos entrar", {
        description: firstError ?? data?.message ?? "Revisa tu email y contraseña.",
      });
      return;
    }

    notify.success("Hola de nuevo", { description: "Entrando a tu barbería…" });
    redirectAfterLogin(data?.user?.first_login_at);
  }

  function redirectAfterLogin(firstLoginAt: string | null | undefined) {
    const target = firstLoginAt == null ? "/admin/onboarding" : "/admin";
    startTransition(() => {
      router.replace(target);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onCredentialsSubmit} className="space-y-5">
      <div>
        <label className="text-sm font-semibold text-ink-2 mb-2 block">Email</label>
        <div className="relative">
          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none z-10" />
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="input-boxed"
            style={{ paddingLeft: "2.75rem" }}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-ink-2 mb-2 block">Contraseña</label>
        <div className="relative">
          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none z-10" />
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input-boxed"
            style={{ paddingLeft: "2.75rem" }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary w-full justify-center py-3.5"
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Entrando…
          </>
        ) : (
          "Entrar"
        )}
      </button>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@elnavajazo.test");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { errors?: Record<string, string[]>; message?: string } | null;
      const firstError = data?.errors ? Object.values(data.errors)[0]?.[0] : null;
      setError(firstError ?? data?.message ?? "Credenciales inválidas.");
      return;
    }

    const json = (await res.json().catch(() => null)) as {
      tenant?: { slug: string } | null;
      user?: { first_login_at?: string | null };
    } | null;

    const slug = json?.tenant?.slug;
    const isFirstLogin = json?.user?.first_login_at == null;
    const target =
      slug && isFirstLogin
        ? `/admin/${slug}/onboarding`
        : slug
          ? `/admin/${slug}`
          : "/admin";

    startTransition(() => {
      router.replace(target);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
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

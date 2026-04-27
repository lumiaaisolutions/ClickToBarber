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

    startTransition(() => {
      router.replace("/admin");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-xs uppercase tracking-wider text-text-2 mb-2 block">Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-bg-overlay/40 border border-border-medium rounded-lg px-4 py-3 text-text focus:border-accent focus:outline-none transition"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-text-2 mb-2 block">Contraseña</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-bg-overlay/40 border border-border-medium rounded-lg px-4 py-3 text-text focus:border-accent focus:outline-none transition"
        />
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-accent hover:bg-accent-2 text-on-accent font-medium rounded-lg px-4 py-3 transition disabled:opacity-50"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

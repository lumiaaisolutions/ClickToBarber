"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Check, Mail, AlertTriangle, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";

export function AffiliateSignupClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError("Nombre y email son requeridos.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/public/affiliates/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase() }),
      });
      if (res.ok) setDone(true);
      else if (res.status === 422) {
        const data = await res.json().catch(() => null);
        const first = data && typeof data === "object" && "errors" in data
          ? Object.values((data as { errors: Record<string, string[]> }).errors)[0]?.[0]
          : null;
        setError(first ?? "Datos inválidos.");
      } else {
        setError("No pudimos completar el registro. Intenta más tarde.");
      }
    });
  }

  return (
    <main className="min-h-screen bg-bg-canvas px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-md mx-auto">
        <Link href="/affiliates" className="inline-flex items-center gap-2 text-ink-muted hover:text-primary text-xs tracking-imperial mb-8">
          <ArrowLeft size={12} /> Volver al portal de afiliados
        </Link>

        <Logo className="h-9 text-primary mb-10" />

        {done ? (
          <div className="card-paper p-7 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-success/15 border border-success/30 flex items-center justify-center">
              <Mail size={20} className="text-success" />
            </div>
            <div className="text-[10px] tracking-imperial text-accent-3">Listo</div>
            <h1 className="font-display italic text-2xl text-ink">Revisa tu correo</h1>
            <p className="text-sm text-ink-2 leading-relaxed">
              Te enviamos a <span className="font-mono text-ink">{email}</span> tu código privado
              de acceso al dashboard de afiliados. Si no llega en 5 minutos, revisa spam.
            </p>
            <Link href="/affiliates" className="btn btn-primary w-full justify-center">
              Ir al portal
            </Link>
          </div>
        ) : (
          <>
            <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Programa de afiliados</div>
            <h1 className="font-display italic text-3xl sm:text-4xl text-ink mb-3">
              Refiere y gana 30% MRR
            </h1>
            <p className="text-ink-2 mb-8 leading-relaxed">
              Cada barbería que se registre con tu link te da el 30% del MRR
              cada mes mientras siga activa. Pagos mensuales por transferencia.
            </p>

            <form onSubmit={submit} className="card-paper p-6 sm:p-7 space-y-4">
              <div>
                <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Nombre</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-boxed w-full"
                />
              </div>
              <div>
                <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-boxed w-full"
                />
              </div>
              {error && (
                <p className="text-sm text-danger flex items-center gap-1">
                  <AlertTriangle size={13} /> {error}
                </p>
              )}
              <button type="submit" disabled={pending} className="btn btn-primary w-full justify-center disabled:opacity-50">
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Registrarme
              </button>
            </form>

            <p className="text-[11px] text-ink-muted mt-5 leading-relaxed text-center">
              Al registrarte aceptas los{" "}
              <Link href="/terminos" className="underline">términos</Link> del programa.
              Puedes solicitar tu baja cuando quieras.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

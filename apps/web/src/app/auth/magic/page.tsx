"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";

type Phase = "consuming" | "ok" | "error";

function MagicLinkContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [phase, setPhase] = useState<Phase>("consuming");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setPhase("error");
      setErrorMsg("Enlace inválido. Falta el token.");
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await fetch("/api/public/magic/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (cancelled) return;

      if (res.ok) {
        setPhase("ok");
        setTimeout(() => router.replace("/admin/onboarding"), 800);
      } else {
        const data = await res.json().catch(() => null);
        setPhase("error");
        setErrorMsg(
          data?.error === "invalid_or_expired_link"
            ? "Este enlace ya fue usado o expiró. Pide uno nuevo desde tu correo."
            : "No pudimos validar el enlace. Inténtalo de nuevo o contacta soporte.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <>
      {phase === "consuming" && (
        <>
          <div className="text-xs font-semibold uppercase tracking-wider text-accent-3 mb-4">
            Validando
          </div>
          <h1 className="font-display font-bold tracking-tight text-3xl text-ink mb-4">
            Activando tu cuenta…
          </h1>
          <div className="mt-8 inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </>
      )}

      {phase === "ok" && (
        <>
          <div className="text-xs font-semibold uppercase tracking-wider text-accent-3 mb-4">
            Bienvenido
          </div>
          <h1 className="font-display font-bold tracking-tight text-3xl text-ink mb-4">
            Cuenta activada.
          </h1>
          <p className="text-ink-2">Te llevamos al wizard de identidad…</p>
        </>
      )}

      {phase === "error" && (
        <>
          <div className="text-xs font-semibold uppercase tracking-wider text-danger mb-4">
            Error
          </div>
          <h1 className="font-display font-bold tracking-tight text-3xl text-ink mb-4">
            No pudimos abrir tu cuenta.
          </h1>
          <p className="text-ink-2 mb-6">{errorMsg}</p>
          <a
            href="mailto:hola@lumiaaisolutions.com"
            className="btn btn-primary"
          >
            Contactar soporte
          </a>
        </>
      )}
    </>
  );
}

export default function MagicLinkPage() {
  return (
    <main className="min-h-screen bg-bg-canvas flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center">
        <Logo className="mx-auto h-9 text-primary mb-12" />
        <Suspense
          fallback={
            <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          }
        >
          <MagicLinkContent />
        </Suspense>
      </div>
    </main>
  );
}

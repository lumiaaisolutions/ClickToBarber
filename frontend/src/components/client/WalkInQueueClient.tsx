"use client";

import { useEffect, useState, useTransition } from "react";
import { Users, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";

interface QueueStatus {
  tenant: { name: string; slug: string };
  waiting: number;
  estimated_minutes: number;
  queue: Array<{ position: number; first_name: string; arrived_at: string }>;
}

type Phase = "view" | "joining" | "joined";

export function WalkInQueueClient({
  slug,
  initial,
}: {
  slug: string;
  initial: QueueStatus;
}) {
  const [phase, setPhase] = useState<Phase>("view");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState<number | null>(null);
  const [estimated, setEstimated] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(initial);

  // Refresh cada 30s
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/queue/${encodeURIComponent(slug)}`);
        if (res.ok) setStatus(await res.json());
      } catch {}
    }, 30000);
    return () => clearInterval(id);
  }, [slug]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setPhase("joining");
    startTransition(async () => {
      const res = await fetch(`/api/public/queue/${encodeURIComponent(slug)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: name, client_phone: phone || null }),
      });
      if (!res.ok) {
        setPhase("view");
        return;
      }
      const data = await res.json();
      setPosition(data.position);
      setEstimated(data.estimated_minutes);
      setPhase("joined");
    });
  }

  if (phase === "joined" && position !== null) {
    return (
      <main className="min-h-screen bg-bg-canvas flex flex-col items-center justify-center px-4 sm:px-6 py-10 text-center">
        <Logo className="h-8 text-primary mb-8" />
        <div className="w-14 h-14 rounded-full bg-success/15 text-success mx-auto flex items-center justify-center mb-5">
          <CheckCircle2 size={28} />
        </div>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">{status.tenant.name}</div>
        <h1 className="font-display italic text-4xl sm:text-5xl text-ink mb-3">
          Eres el #{position}
        </h1>
        <p className="text-ink-2 text-lg">
          Tiempo estimado: <strong>~{estimated} min</strong>
        </p>
        <p className="text-ink-muted text-sm mt-4 max-w-sm mx-auto leading-relaxed">
          Puedes alejarte. Te avisamos por WhatsApp 5 min antes de tu turno si nos dejaste tu teléfono.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-canvas px-4 sm:px-6 py-10">
      <div className="max-w-md mx-auto">
        <Logo className="h-8 text-primary mb-8" />
        <div className="text-[10px] tracking-imperial text-accent-3 mb-2">{status.tenant.name}</div>
        <h1 className="font-display italic text-3xl sm:text-4xl text-ink mb-2">Fila virtual</h1>
        <p className="text-sm text-ink-2 mb-6">Anótate sin reserva previa.</p>

        <div className="card-paper p-5 mb-6 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] tracking-imperial text-ink-muted flex items-center gap-1.5">
              <Users size={11} /> Esperando
            </div>
            <div className="font-display italic text-3xl text-ink mt-1">{status.waiting}</div>
          </div>
          <div>
            <div className="text-[10px] tracking-imperial text-ink-muted flex items-center gap-1.5">
              <Clock size={11} /> Espera estimada
            </div>
            <div className="font-display italic text-3xl text-ink mt-1">{status.estimated_minutes}<span className="text-base text-ink-muted ml-1">min</span></div>
          </div>
        </div>

        <form onSubmit={join} className="card-paper p-5 sm:p-6 space-y-4">
          <div>
            <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">Tu nombre</label>
            <input
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-boxed"
            />
          </div>
          <div>
            <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">
              WhatsApp (opcional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 55 1234 5678"
              className="input-boxed font-mono"
            />
          </div>
          <button type="submit" disabled={pending || !name} className="btn btn-primary w-full justify-center">
            {pending ? <Loader2 size={14} className="animate-spin" /> : null}
            Anotarme en la fila
          </button>
        </form>
      </div>
    </main>
  );
}

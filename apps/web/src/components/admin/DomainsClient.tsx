"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Plus, Trash2, ShieldCheck, Loader2, Check, Star, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Domain {
  id: number;
  host: string;
  verification: { record_name: string; record_type: string; record_value: string };
  verified_at: string | null;
  is_primary: boolean;
  created_at: string | null;
}

export function DomainsClient({ initial }: { initial: Domain[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [host, setHost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: host.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          data?.error === "host_taken"
            ? "Ese dominio ya está en uso por otra barbería."
            : data?.errors ? Object.values(data.errors as Record<string, string[]>)[0]?.[0]
            : "Error al agregar el dominio.",
        );
        return;
      }
      setHost("");
      router.refresh();
    });
  }

  function verify(id: number) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/domains/${id}/verify`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          data?.error === "txt_not_found"
            ? "No encontramos el registro TXT en tu DNS. Revisa la configuración y vuelve a intentar en unos minutos (la propagación puede tardar)."
            : "Error al verificar.",
        );
        return;
      }
      router.refresh();
    });
  }

  function makePrimary(id: number) {
    startTransition(async () => {
      await fetch(`/api/admin/domains/${id}/primary`, { method: "POST" });
      router.refresh();
    });
  }

  function remove(d: Domain) {
    if (!confirm(`¿Quitar el dominio "${d.host}"? Las reservas en ese host dejarán de funcionar.`)) return;
    startTransition(async () => {
      await fetch(`/api/admin/domains/${d.id}`, { method: "DELETE" });
      router.refresh();
    });
  }

  async function copyToken(d: Domain) {
    await navigator.clipboard?.writeText(d.verification.record_value);
    setCopiedId(d.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">White-label</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">
          Dominios propios
        </h1>
        <p className="text-ink-2 text-sm mt-3 leading-relaxed">
          Reserva en tu propio dominio (ej. <code className="font-mono">reservas.barberia.com</code>) en lugar de la URL de LUMIA. Configura un CNAME y un TXT — verificamos automáticamente.
        </p>
      </header>

      <form
        onSubmit={add}
        className="card-paper p-5 sm:p-7 flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <div className="flex-1">
          <label className="text-[10px] tracking-imperial text-ink-muted mb-1.5 block">
            Dominio o subdominio
          </label>
          <input
            type="text"
            required
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="reservas.tubarberia.com"
            pattern="[a-zA-Z0-9.\-]+"
            className="input-boxed font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !host}
          className="btn btn-primary disabled:opacity-50 sm:self-end"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Agregar
        </button>
      </form>

      {error && (
        <div className="p-3 rounded-[10px] bg-danger/8 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      {initial.length === 0 ? (
        <div className="card-paper p-10 text-center text-ink-2">
          Sin dominios todavía. Agrega uno arriba para empezar la verificación.
        </div>
      ) : (
        <ul className="space-y-3">
          {initial.map((d) => {
            const verified = !!d.verified_at;
            return (
              <li key={d.id} className="card-paper p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-bg-vellum border border-line-medium flex items-center justify-center text-primary shrink-0">
                      <Globe size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display italic text-lg sm:text-xl text-ink truncate">
                          {d.host}
                        </span>
                        {d.is_primary && (
                          <span className="text-[10px] tracking-imperial bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Star size={10} /> Primario
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-muted mt-0.5">
                        {verified ? (
                          <span className="text-success">Verificado</span>
                        ) : (
                          <span className="text-warning">Pendiente de verificar TXT</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {!verified && (
                      <button
                        onClick={() => verify(d.id)}
                        disabled={pending}
                        className="btn btn-ghost text-xs disabled:opacity-50"
                      >
                        {pending ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                        Verificar TXT
                      </button>
                    )}
                    {verified && !d.is_primary && (
                      <button
                        onClick={() => makePrimary(d.id)}
                        disabled={pending}
                        className="btn btn-ghost text-xs disabled:opacity-50"
                      >
                        <Star size={12} /> Marcar primario
                      </button>
                    )}
                    <button
                      onClick={() => remove(d)}
                      disabled={pending}
                      className="btn btn-ghost text-xs text-danger hover:!border-danger disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Quitar
                    </button>
                  </div>
                </div>

                {!verified && (
                  <div className="mt-4 pt-4 border-t border-line-fine space-y-3">
                    <p className="text-xs text-ink-2 leading-relaxed">
                      Crea estos dos registros DNS y luego pulsa <strong>Verificar TXT</strong>:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-[100px_120px_1fr_auto] gap-2 text-xs items-center bg-bg-vellum p-3 rounded-[8px] border border-line-fine">
                      <span className="font-mono text-ink-muted">TXT</span>
                      <code className="font-mono text-ink truncate">{d.verification.record_name}.{d.host}</code>
                      <code className="font-mono text-primary break-all">{d.verification.record_value}</code>
                      <button
                        onClick={() => copyToken(d)}
                        className="btn btn-ghost px-2 py-1 text-[10px]"
                        type="button"
                      >
                        {copiedId === d.id ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                    </div>
                    <div className={cn(
                      "grid grid-cols-1 sm:grid-cols-[100px_120px_1fr] gap-2 text-xs items-center bg-bg-vellum p-3 rounded-[8px] border border-line-fine",
                    )}>
                      <span className="font-mono text-ink-muted">CNAME</span>
                      <code className="font-mono text-ink truncate">{d.host}</code>
                      <code className="font-mono text-primary break-all">cname.lumia.app</code>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

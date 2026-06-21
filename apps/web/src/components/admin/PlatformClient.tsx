"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Key, Webhook, Plus, Loader2, Copy, Check, Trash2, X, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

interface ApiKey { id: number; name: string; prefix: string; scopes: string[]; last_used_at: string | null; expires_at: string | null; revoked_at: string | null; }
interface WebhookI { id: number; url: string; events: string[]; is_active: boolean; consecutive_failures: number; last_success_at: string | null; last_failure_at: string | null; }

const AVAILABLE_SCOPES = ["*", "appointments:read", "appointments:write", "ratings:read", "loyalty:read", "products:read"];
const AVAILABLE_EVENTS = ["*", "appointment.booked", "appointment.confirmed", "appointment.cancelled", "appointment.completed"];

export function PlatformClient({ keys, webhooks }: { keys: ApiKey[]; webhooks: WebhookI[] }) {
  const [tab, setTab] = useState<"keys" | "webhooks">("keys");

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Plataforma</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">API & Webhooks</h1>
        <p className="text-ink-2 text-sm mt-3 max-w-xl leading-relaxed">
          Para integraciones técnicas (plan Enterprise). Llaves API con scopes granulares y webhooks salientes con HMAC firmado.
        </p>
      </header>

      <div className="flex gap-2">
        <button onClick={() => setTab("keys")} className={cn("btn text-xs", tab === "keys" ? "btn-primary" : "btn-ghost")}>
          <Key size={12} /> API keys
        </button>
        <button onClick={() => setTab("webhooks")} className={cn("btn text-xs", tab === "webhooks" ? "btn-primary" : "btn-ghost")}>
          <Webhook size={12} /> Webhooks
        </button>
      </div>

      {tab === "keys" ? <KeysSection initial={keys} /> : <WebhooksSection initial={webhooks} />}
    </div>
  );
}

function KeysSection({ initial }: { initial: ApiKey[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["appointments:read"]);
  const [issued, setIssued] = useState<{ token: string; prefix: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function issue(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/admin/platform/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scopes }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setIssued({ token: data.token, prefix: data.prefix });
      router.refresh();
    });
  }

  function revoke(id: number) {
    if (!confirm("¿Revocar esta llave?")) return;
    startTransition(async () => {
      await fetch(`/api/admin/platform/keys/${id}/revoke`, { method: "POST" });
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => { setOpen(true); setIssued(null); setName(""); }} className="btn btn-primary text-xs">
          <Plus size={12} /> Nueva llave
        </button>
      </div>

      {initial.length === 0 ? (
        <EmptyState icon={<Key size={20} />} title="Sin llaves API" />
      ) : (
        <div className="card-paper overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="text-[10px] uppercase tracking-imperial text-ink-muted">
                <tr className="border-b border-line-fine">
                  <th className="text-left px-4 sm:px-6 py-3">Nombre</th>
                  <th className="text-left px-3 py-3">Prefijo</th>
                  <th className="text-left px-3 py-3">Scopes</th>
                  <th className="text-left px-3 py-3">Última uso</th>
                  <th className="text-right px-4 sm:px-6 py-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {initial.map((k) => (
                  <tr key={k.id} className={cn("border-b border-line-fine last:border-0", k.revoked_at && "opacity-50")}>
                    <td className="px-4 sm:px-6 py-3 font-display italic text-ink">{k.name}</td>
                    <td className="px-3 py-3 font-mono text-xs">{k.prefix}…</td>
                    <td className="px-3 py-3 text-xs">{k.scopes.join(", ")}</td>
                    <td className="px-3 py-3 text-xs text-ink-muted">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString("es-MX") : "—"}</td>
                    <td className="px-4 sm:px-6 py-3 text-right">
                      {!k.revoked_at && (
                        <button onClick={() => revoke(k.id)} className="btn btn-ghost text-xs py-1 px-2.5 text-danger hover:!border-danger">
                          <ShieldOff size={11} /> Revocar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/40 backdrop-blur-sm overflow-y-auto" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="card-paper w-full max-w-md p-5 sm:p-7 space-y-4 my-auto">
            <header className="flex items-start justify-between gap-3">
              <h2 className="font-display italic text-2xl text-ink">{issued ? "Tu nueva llave" : "Nueva API key"}</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-ink-muted p-1"><X size={18} /></button>
            </header>

            {issued ? (
              <>
                <div className="bg-bg-vellum p-3 rounded-[8px] border border-line-fine">
                  <code className="font-mono text-xs break-all">{issued.token}</code>
                </div>
                <button onClick={async () => { await navigator.clipboard?.writeText(issued.token); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="btn btn-primary w-full justify-center text-xs">
                  {copied ? <Check size={12} /> : <Copy size={12} />} Copiar (no se vuelve a mostrar)
                </button>
              </>
            ) : (
              <form onSubmit={issue} className="space-y-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre descriptivo" className="input-boxed" required />
                <div>
                  <div className="text-[10px] tracking-imperial text-ink-muted mb-1.5">Scopes</div>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_SCOPES.map((s) => (
                      <label key={s} className="text-xs inline-flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={scopes.includes(s)} onChange={(e) => setScopes(e.target.checked ? [...scopes, s] : scopes.filter((x) => x !== s))} />
                        <code className="font-mono">{s}</code>
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={pending || !name} className="btn btn-primary w-full justify-center">
                  {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Emitir
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function WebhooksSection({ initial }: { initial: WebhookI[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["*"]);
  const [issued, setIssued] = useState<{ secret: string } | null>(null);

  function create(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/admin/platform/webhooks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, events }),
      });
      if (!res.ok) return;
      const d = await res.json();
      setIssued({ secret: d.secret });
      router.refresh();
    });
  }

  function remove(id: number) {
    if (!confirm("¿Borrar este webhook?")) return;
    startTransition(async () => {
      await fetch(`/api/admin/platform/webhooks/${id}`, { method: "DELETE" });
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => { setOpen(true); setIssued(null); setUrl(""); }} className="btn btn-primary text-xs">
          <Plus size={12} /> Nuevo webhook
        </button>
      </div>

      {initial.length === 0 ? (
        <EmptyState icon={<Webhook size={20} />} title="Sin webhooks salientes" />
      ) : (
        <ul className="space-y-2">
          {initial.map((w) => (
            <li key={w.id} className="card-paper p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <code className="font-mono text-sm break-all">{w.url}</code>
                <div className="text-xs text-ink-muted mt-1">
                  {w.events.join(", ")} · {w.is_active ? "activo" : "inactivo"} · {w.consecutive_failures} fallos
                </div>
              </div>
              <button onClick={() => remove(w.id)} className="btn btn-ghost text-xs text-danger hover:!border-danger self-start sm:self-auto">
                <Trash2 size={12} /> Borrar
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/40 backdrop-blur-sm overflow-y-auto" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="card-paper w-full max-w-md p-5 sm:p-7 space-y-4 my-auto">
            <h2 className="font-display italic text-2xl text-ink">{issued ? "Webhook creado" : "Nuevo webhook"}</h2>
            {issued ? (
              <>
                <div className="text-sm text-ink-2">Tu secret HMAC (no se vuelve a mostrar):</div>
                <code className="block font-mono text-xs break-all bg-bg-vellum p-3 rounded-[8px] border border-line-fine">{issued.secret}</code>
                <button onClick={() => setOpen(false)} className="btn btn-primary w-full justify-center">Listo</button>
              </>
            ) : (
              <form onSubmit={create} className="space-y-3">
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://tu-app.com/lumia" className="input-boxed font-mono text-sm" required />
                <div>
                  <div className="text-[10px] tracking-imperial text-ink-muted mb-1.5">Eventos</div>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_EVENTS.map((ev) => (
                      <label key={ev} className="text-xs inline-flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={events.includes(ev)} onChange={(e) => setEvents(e.target.checked ? [...events, ev] : events.filter((x) => x !== ev))} />
                        <code className="font-mono">{ev}</code>
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={pending || !url} className="btn btn-primary w-full justify-center">
                  {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

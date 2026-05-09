"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: number;
  action: string;
  subject: { type: string; id: string };
  actor: string | null;
  changes: Record<string, unknown> | null;
  ip: string | null;
  request_id: string | null;
  created_at: string | null;
}

const ACTION_LABELS: Record<string, { label: string; tone: "ink" | "primary" | "warning" | "danger" | "success" }> = {
  created: { label: "Creó", tone: "success" },
  updated: { label: "Editó", tone: "primary" },
  deleted: { label: "Eliminó", tone: "danger" },
  "login.success": { label: "Login OK", tone: "success" },
  "login.failed": { label: "Login fallido", tone: "danger" },
  "2fa.enabled": { label: "Activó 2FA", tone: "primary" },
  "2fa.disabled": { label: "Desactivó 2FA", tone: "warning" },
};

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Todos" },
  { key: "created", label: "Crear" },
  { key: "updated", label: "Editar" },
  { key: "deleted", label: "Eliminar" },
  { key: "login.success", label: "Logins" },
  { key: "login.failed", label: "Login fallidos" },
];

export function AuditLogClient({
  initial,
  activeFilter,
}: {
  initial: { count: number; logs: AuditEntry[] };
  activeFilter: string | null;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Seguridad</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">
          Bitácora de cambios
        </h1>
        <p className="text-ink-2 text-sm mt-3 max-w-xl leading-relaxed">
          Historial inmutable de las acciones realizadas en tu tenant: quién,
          qué, cuándo y desde dónde. Útil para disputas con barberos y auditorías.
        </p>
      </header>

      {/* Filtros */}
      <nav className="flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-ink-muted shrink-0" />
        {FILTERS.map((f) => {
          const active = (activeFilter ?? "") === f.key;
          return (
            <Link
              key={f.key}
              href={f.key ? `/admin/audit?action=${f.key}` : "/admin/audit"}
              prefetch={false}
              className={cn(
                "text-xs tracking-noble px-3 py-1.5 rounded-full transition-all",
                active
                  ? "bg-primary text-bg-canvas"
                  : "bg-bg-vellum text-ink-2 hover:text-primary border border-line-medium",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {initial.logs.length === 0 ? (
        <div className="card-paper p-10 text-center text-ink-2">
          Sin registros en este filtro.
        </div>
      ) : (
        <div className="card-paper overflow-hidden">
          <ul className="divide-y divide-line-fine">
            {initial.logs.map((entry) => {
              const meta = ACTION_LABELS[entry.action] ?? {
                label: entry.action,
                tone: "ink" as const,
              };
              const open = expanded === entry.id;
              const ts = entry.created_at ? new Date(entry.created_at) : null;

              return (
                <li key={entry.id} className="px-4 sm:px-5 py-3 sm:py-4">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : entry.id)}
                    className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-left"
                  >
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-imperial px-2 py-0.5 rounded-full inline-flex w-fit",
                        meta.tone === "primary" && "bg-primary/15 text-primary border border-primary/30",
                        meta.tone === "success" && "bg-success/15 text-success border border-success/30",
                        meta.tone === "warning" && "bg-warning/15 text-warning border border-warning/30",
                        meta.tone === "danger"  && "bg-danger/15 text-danger border border-danger/30",
                        meta.tone === "ink"     && "bg-bg-vellum text-ink-2 border border-line-medium",
                      )}
                    >
                      {meta.label}
                    </span>
                    <span className="font-display italic text-sm sm:text-base text-ink truncate flex-1">
                      {entry.subject.type} <span className="font-mono text-xs text-ink-muted">#{entry.subject.id}</span>
                    </span>
                    <span className="text-xs text-ink-muted truncate">
                      {entry.actor ?? "sistema"}
                    </span>
                    <span className="text-xs text-ink-muted font-mono shrink-0">
                      {ts ? ts.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </span>
                    {entry.changes ? (
                      <span className="text-ink-muted">
                        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    ) : (
                      <span className="text-ink-muted shrink-0"><Eye size={12} className="opacity-30" /></span>
                    )}
                  </button>

                  {open && entry.changes && (
                    <pre className="mt-3 sm:mt-4 bg-bg-vellum border border-line-fine rounded-[10px] p-3 sm:p-4 text-[11px] text-ink-2 overflow-x-auto font-mono leading-relaxed">
{JSON.stringify(entry.changes, null, 2)}
                    </pre>
                  )}
                  {open && entry.ip && (
                    <div className="mt-2 text-[11px] text-ink-muted font-mono">
                      ip {entry.ip} · req {entry.request_id ?? "?"}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

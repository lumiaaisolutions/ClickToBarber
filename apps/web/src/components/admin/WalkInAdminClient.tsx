"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, PhoneCall, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

interface Entry {
  id: number;
  client_name: string;
  client_phone: string | null;
  status: "waiting" | "in_progress" | "served" | "abandoned";
  arrived_at: string | null;
}

const STATUS_TONE: Record<Entry["status"], string> = {
  waiting:     "bg-warning/15 text-warning border-warning/30",
  in_progress: "bg-info/15 text-info border-info/30",
  served:      "bg-success/15 text-success border-success/30",
  abandoned:   "bg-bg-vellum text-ink-muted border-line-medium",
};

const STATUS_LABEL: Record<Entry["status"], string> = {
  waiting: "Esperando", in_progress: "Atendiendo", served: "Servido", abandoned: "Abandonó",
};

export function WalkInAdminClient({ initial }: { initial: Entry[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function action(id: number, action: "call" | "serve" | "abandon") {
    startTransition(async () => {
      await fetch(`/api/admin/queue/${id}/${action}`, { method: "POST" });
      router.refresh();
    });
  }

  const waiting = initial.filter((e) => e.status === "waiting");
  const inProgress = initial.filter((e) => e.status === "in_progress");

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Operación</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Fila virtual</h1>
        <p className="text-ink-2 text-sm mt-3 max-w-xl leading-relaxed">
          Walk-ins de hoy. El cliente entra por <code className="font-mono text-primary">/q/&lt;slug&gt;</code> (QR físico de la barbería).
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Kpi label="Esperando" value={waiting.length} icon={Users} />
        <Kpi label="En servicio" value={inProgress.length} icon={PhoneCall} />
      </div>

      {initial.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="Sin walk-ins hoy"
          description="Cuando alguien escanee el QR de la barbería aparecerá aquí."
        />
      ) : (
        <div className="card-paper overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="text-[10px] uppercase tracking-imperial text-ink-muted">
                <tr className="border-b border-line-fine">
                  <th className="text-left px-4 sm:px-6 py-3">Cliente</th>
                  <th className="text-left px-3 py-3">Teléfono</th>
                  <th className="text-left px-3 py-3">Llegó</th>
                  <th className="text-left px-3 py-3">Estado</th>
                  <th className="text-right px-4 sm:px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {initial.map((e) => {
                  const arrived = e.arrived_at ? new Date(e.arrived_at) : null;
                  return (
                    <tr key={e.id} className="border-b border-line-fine last:border-0">
                      <td className="px-4 sm:px-6 py-3 font-display italic text-ink">{e.client_name}</td>
                      <td className="px-3 py-3 font-mono text-xs text-ink-2">{e.client_phone ?? "—"}</td>
                      <td className="px-3 py-3 text-xs text-ink-muted">
                        {arrived ? arrived.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("text-[10px] tracking-imperial px-2 py-0.5 rounded-full inline-block border", STATUS_TONE[e.status])}>
                          {STATUS_LABEL[e.status]}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-right">
                        <div className="inline-flex flex-wrap gap-2 justify-end">
                          {e.status === "waiting" && (
                            <button onClick={() => action(e.id, "call")} disabled={pending} className="btn btn-ghost text-xs py-1 px-2.5">
                              {pending ? <Loader2 size={11} className="animate-spin" /> : <PhoneCall size={11} />} Llamar
                            </button>
                          )}
                          {e.status === "in_progress" && (
                            <button onClick={() => action(e.id, "serve")} disabled={pending} className="btn btn-ghost text-xs py-1 px-2.5 text-success hover:!border-success">
                              <CheckCircle2 size={11} /> Servir
                            </button>
                          )}
                          {(e.status === "waiting" || e.status === "in_progress") && (
                            <button onClick={() => action(e.id, "abandon")} disabled={pending} className="btn btn-ghost text-xs py-1 px-2.5 text-danger hover:!border-danger">
                              <XCircle size={11} /> Abandonó
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return (
    <div className="card-paper p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] tracking-imperial text-ink-muted">{label}</div>
          <div className="font-display italic text-3xl sm:text-4xl text-ink tabular-nums mt-1">{value}</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary/8 text-primary flex items-center justify-center shrink-0">
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}

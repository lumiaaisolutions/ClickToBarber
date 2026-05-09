"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Gift, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgramConfig {
  is_active: boolean;
  every_n_visits: number;
  reward_type: "discount_pct" | "free_service";
  reward_value: number;
  reward_label: string | null;
  expiry_days: number;
}

interface Reward {
  id: number;
  code: string;
  reward_type: string;
  reward_value: number;
  reward_label: string | null;
  user: { id: number; name: string; email: string } | null;
  issued_at: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
  usable: boolean;
}

interface Initial {
  program: ProgramConfig;
  kpis: {
    rewards_active: number;
    rewards_redeemed: number;
    visits_credited: number;
  };
}

export function LoyaltyClient({
  initial,
  rewards,
}: {
  initial: Initial;
  rewards: Reward[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [program, setProgram] = useState<ProgramConfig>(initial.program);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ProgramConfig>(k: K, v: ProgramConfig[K]) {
    setProgram((p) => ({ ...p, [k]: v }));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/loyalty", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(program),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { errors?: Record<string, string[]>; message?: string }
          | null;
        const firstErr = data?.errors ? Object.values(data.errors)[0]?.[0] : null;
        setError(firstErr ?? data?.message ?? "Error al guardar.");
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Crecimiento</div>
          <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Loyalty</h1>
          <p className="text-ink-2 text-sm mt-3 max-w-xl leading-relaxed">
            Premia a tus clientes recurrentes. Cada N visitas completadas, el
            sistema emite una recompensa automática que el cliente canjea
            mostrando el código en caja.
          </p>
        </div>
        <button
          onClick={save}
          disabled={pending}
          className="btn btn-primary disabled:opacity-50 self-start sm:self-auto"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Guardar cambios
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Kpi label="Visitas acreditadas" value={initial.kpis.visits_credited} icon={Sparkles} />
        <Kpi label="Recompensas activas" value={initial.kpis.rewards_active} icon={Gift} />
        <Kpi label="Recompensas redimidas" value={initial.kpis.rewards_redeemed} icon={Gift} />
      </div>

      {/* Configuración */}
      <div className="card-paper p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 justify-between">
          <div>
            <h2 className="font-display italic text-xl sm:text-2xl text-ink">Estado del programa</h2>
            <p className="text-sm text-ink-2 mt-1">
              {program.is_active
                ? "Activo — cada cita completada se acredita."
                : "Inactivo — las visitas no acreditan recompensas."}
            </p>
          </div>
          <Toggle
            value={program.is_active}
            onChange={(v) => update("is_active", v)}
          />
        </div>

        <hr className="hairline" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Cada cuántas visitas otorgas recompensa">
            <input
              type="number"
              min={2}
              max={50}
              className="input-boxed font-mono"
              value={program.every_n_visits}
              onChange={(e) => update("every_n_visits", Number(e.target.value))}
            />
          </Field>
          <Field label="Tipo de recompensa">
            <select
              className="input-boxed"
              value={program.reward_type}
              onChange={(e) => update("reward_type", e.target.value as ProgramConfig["reward_type"])}
            >
              <option value="discount_pct">Descuento %</option>
              <option value="free_service">Servicio gratis</option>
            </select>
          </Field>
          <Field
            label={
              program.reward_type === "discount_pct"
                ? "% de descuento"
                : "% de cobertura del servicio (100 = gratis)"
            }
          >
            <input
              type="number"
              min={1}
              max={100}
              className="input-boxed font-mono"
              value={program.reward_value}
              onChange={(e) => update("reward_value", Number(e.target.value))}
            />
          </Field>
          <Field label="Días de vigencia (0 = sin expiración)">
            <input
              type="number"
              min={0}
              max={365}
              className="input-boxed font-mono"
              value={program.expiry_days}
              onChange={(e) => update("expiry_days", Number(e.target.value))}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Etiqueta visible al cliente (opcional)">
              <input
                type="text"
                maxLength={120}
                placeholder="Ej. Corte gratis al cumplir 10 visitas"
                className="input-boxed"
                value={program.reward_label ?? ""}
                onChange={(e) => update("reward_label", e.target.value || null)}
              />
            </Field>
          </div>
        </div>

        {error && (
          <div className="text-sm text-danger bg-danger/8 border border-danger/30 rounded-[10px] px-4 py-3">
            {error}
          </div>
        )}
        {savedAt && (
          <div className="text-sm text-success bg-success/8 border border-success/30 rounded-[10px] px-4 py-3">
            Guardado.
          </div>
        )}
      </div>

      {/* Rewards emitidas */}
      {rewards.length > 0 && (
        <div className="card-paper p-5 sm:p-7">
          <h2 className="font-display italic text-xl sm:text-2xl text-ink mb-4">
            Recompensas emitidas
          </h2>
          <div className="overflow-x-auto -mx-5 sm:-mx-7">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="text-[10px] uppercase tracking-imperial text-ink-muted">
                <tr className="border-b border-line-fine">
                  <th className="text-left px-5 sm:px-7 py-3">Código</th>
                  <th className="text-left px-3 py-3">Cliente</th>
                  <th className="text-left px-3 py-3">Tipo</th>
                  <th className="text-left px-3 py-3">Estado</th>
                  <th className="text-left px-5 sm:px-7 py-3">Emitida</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((r) => (
                  <tr key={r.id} className="border-b border-line-fine last:border-0">
                    <td className="px-5 sm:px-7 py-3 font-mono">{r.code}</td>
                    <td className="px-3 py-3">{r.user?.name ?? "—"}</td>
                    <td className="px-3 py-3 text-ink-2">
                      {r.reward_type === "free_service" ? "Servicio gratis" : `${r.reward_value}% off`}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "text-[10px] tracking-imperial px-2 py-0.5 rounded-full inline-block",
                          r.redeemed_at && "bg-bg-vellum text-ink-muted",
                          !r.redeemed_at && r.usable && "bg-success/15 text-success border border-success/30",
                          !r.redeemed_at && !r.usable && "bg-danger/15 text-danger border border-danger/30",
                        )}
                      >
                        {r.redeemed_at ? "Redimida" : r.usable ? "Activa" : "Vencida"}
                      </span>
                    </td>
                    <td className="px-5 sm:px-7 py-3 text-ink-muted text-xs">
                      {r.issued_at ? new Date(r.issued_at).toLocaleDateString("es-MX") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Sparkles;
}) {
  return (
    <div className="card-paper p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] tracking-imperial text-ink-muted">{label}</div>
          <div className="font-display italic text-3xl sm:text-4xl text-ink tabular-nums mt-1">
            {value}
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary/8 text-primary flex items-center justify-center shrink-0">
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-imperial text-ink-muted mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        "w-12 h-7 rounded-full transition-colors relative shrink-0",
        value ? "bg-primary" : "bg-bg-vellum border border-line-medium",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 w-6 h-6 bg-bg-canvas rounded-full transition-all shadow",
          value ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

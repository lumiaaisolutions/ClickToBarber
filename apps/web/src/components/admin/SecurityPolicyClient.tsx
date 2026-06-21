"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Check } from "lucide-react";

interface Policy {
  require_2fa: boolean;
  session_idle_minutes: number;
  password_policy: "basic" | "strong";
}

export function SecurityPolicyClient({ initial }: { initial: Policy }) {
  const router = useRouter();
  const [policy, setPolicy] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function save() {
    startTransition(async () => {
      const res = await fetch("/api/admin/security/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      });
      if (res.ok) { setSavedAt(Date.now()); router.refresh(); }
    });
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-2xl">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Seguridad</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Política de seguridad</h1>
        <p className="text-ink-2 text-sm mt-3 leading-relaxed">
          Reglas que se aplican a todos los usuarios del portal admin de tu barbería.
        </p>
      </header>

      <div className="card-paper p-5 sm:p-7 space-y-5">
        <Row label="Verificación en dos pasos obligatoria"
             desc="Cualquier admin/manager/recepción tendrá que activar 2FA antes de operar.">
          <Toggle value={policy.require_2fa} onChange={(v) => setPolicy({ ...policy, require_2fa: v })} />
        </Row>

        <hr className="hairline" />

        <Row label="Cierre de sesión por inactividad"
             desc="Minutos antes de pedir login otra vez. 0 = nunca.">
          <input type="number" min={0} max={43200} value={policy.session_idle_minutes}
                 onChange={(e) => setPolicy({ ...policy, session_idle_minutes: Number(e.target.value) })}
                 className="input-boxed font-mono w-32" />
        </Row>

        <hr className="hairline" />

        <Row label="Política de password" desc="Strong = mínimo 10 chars con mayúsc/minús/núm/símb + chequeo HIBP.">
          <select value={policy.password_policy}
                  onChange={(e) => setPolicy({ ...policy, password_policy: e.target.value as "basic" | "strong" })}
                  className="input-boxed">
            <option value="basic">Básica (mín. 6)</option>
            <option value="strong">Fuerte (recomendado)</option>
          </select>
        </Row>

        <button onClick={save} disabled={pending} className="btn btn-primary w-full justify-center disabled:opacity-50">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Guardar
        </button>
        {savedAt && <p className="text-xs text-success text-center">Guardado.</p>}
      </div>
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-start sm:justify-between">
      <div className="flex-1">
        <div className="font-display italic text-ink">{label}</div>
        {desc && <p className="text-xs text-ink-2 mt-1 leading-snug">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`w-12 h-7 rounded-full relative transition-colors ${value ? "bg-primary" : "bg-bg-vellum border border-line-medium"}`}>
      <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-bg-canvas shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

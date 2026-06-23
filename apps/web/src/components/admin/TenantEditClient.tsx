"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Users, Calendar, CreditCard, ToggleLeft, ToggleRight, Check } from "lucide-react";
import { Card, CardTitle, CardEyebrow } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface Plan { id: number; code: string; name: string; price_cents: number }
interface TenantDetail {
  id: string; name: string; slug: string; owner_email: string;
  plan_id: number | null; plan_code: string | null; plan_name: string | null;
  plan_status: string | null; pago_externo: boolean | null;
  trial_ends_at: string | null; trial_days_left: number | null;
  timezone: string | null; phone: string | null; address: string | null;
  created_at: string; updated_at: string;
}
interface User { id: number; name: string; email: string; role: string; created_at: string }

const STATUS_OPTIONS = ["active", "trialing", "incomplete", "past_due", "canceled"];

export function TenantEditClient({
  tenant,
  users,
  availablePlans,
}: {
  tenant: TenantDetail;
  users: User[];
  availablePlans: Plan[];
}) {
  const router = useRouter();
  const [planId, setPlanId] = useState<string>(String(tenant.plan_id ?? ""));
  const [planStatus, setPlanStatus] = useState(tenant.plan_status ?? "trialing");
  const [pagoExterno, setPagoExterno] = useState<boolean>(!!tenant.pago_externo);
  const [trialEndsAt, setTrialEndsAt] = useState(
    tenant.trial_ends_at ? tenant.trial_ends_at.slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/superadmin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          plan_id:       planId ? Number(planId) : null,
          plan_status:   planStatus,
          pago_externo:  pagoExterno,
          trial_ends_at: trialEndsAt || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.message ?? "Error al guardar");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex items-start gap-4">
        <Link href="/admin/superadmin/tenants" className="btn btn-ghost text-sm mt-1">
          <ArrowLeft size={14} /> Volver
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-1">LUMIA Platform</div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight truncate">{tenant.name}</h1>
          <p className="text-ink-muted text-xs mt-1">{tenant.slug} · {tenant.owner_email}</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn("btn text-sm shrink-0", saved ? "btn-tonal" : "btn-primary")}
        >
          <Save size={14} />
          {saving ? "Guardando…" : saved ? <><Check size={13} /> Guardado</> : "Guardar cambios"}
        </button>
      </header>

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Plan & Status */}
        <Card>
          <CardEyebrow><CreditCard size={12} className="inline mr-1" />Suscripción</CardEyebrow>
          <CardTitle className="mb-5">Plan y estado</CardTitle>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1.5">Plan</label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="input-field text-sm"
              >
                <option value="">— Sin plan —</option>
                {availablePlans.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name} ({p.code}) — ${(p.price_cents / 100).toLocaleString("es-MX")} MXN/mes
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1.5">Estado del plan</label>
              <select
                value={planStatus}
                onChange={(e) => setPlanStatus(e.target.value)}
                className="input-field text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1.5">Fin de prueba</label>
              <input
                type="date"
                value={trialEndsAt}
                onChange={(e) => setTrialEndsAt(e.target.value)}
                className="input-field text-sm"
              />
              {tenant.trial_days_left !== null && (
                <p className="text-xs text-ink-muted mt-1.5">
                  {tenant.trial_days_left > 0 ? `${tenant.trial_days_left} días restantes` : "Prueba vencida"}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Pago externo */}
        <Card>
          <CardEyebrow>Acceso manual</CardEyebrow>
          <CardTitle className="mb-3">Pago externo (bypass)</CardTitle>
          <p className="text-sm text-ink-2 mb-5">
            Cuando está activo, este negocio tiene acceso completo sin importar el estado de su suscripción Stripe.
            Úsalo para clientes que pagan en efectivo, transferencia, o cuentas de demostración.
          </p>

          <button
            type="button"
            onClick={() => setPagoExterno((v) => !v)}
            className={cn(
              "flex items-center gap-3 w-full p-4 rounded-xl border transition-all",
              pagoExterno
                ? "bg-success/10 border-success/40 text-success"
                : "bg-bg-vellum border-line-medium text-ink-2",
            )}
          >
            {pagoExterno
              ? <ToggleRight size={24} strokeWidth={1.8} />
              : <ToggleLeft  size={24} strokeWidth={1.8} />}
            <div className="text-left">
              <div className="text-sm font-semibold">{pagoExterno ? "Pago externo ACTIVO" : "Pago externo inactivo"}</div>
              <div className="text-xs mt-0.5 opacity-70">
                {pagoExterno ? "Acceso garantizado sin Stripe" : "Verifica suscripción normalmente"}
              </div>
            </div>
          </button>

          <div className="mt-5 p-3 rounded-lg bg-bg-vellum text-xs text-ink-2 space-y-1">
            <div><span className="font-semibold">Creado:</span> {new Date(tenant.created_at).toLocaleDateString("es-MX", { dateStyle: "medium" })}</div>
            <div><span className="font-semibold">Actualizado:</span> {new Date(tenant.updated_at).toLocaleDateString("es-MX", { dateStyle: "medium" })}</div>
            {tenant.timezone && <div><span className="font-semibold">Zona:</span> {tenant.timezone}</div>}
          </div>
        </Card>
      </div>

      {/* Users */}
      <Card>
        <CardEyebrow><Users size={12} className="inline mr-1" />Personal</CardEyebrow>
        <CardTitle className="mb-4">Usuarios de este negocio</CardTitle>

        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-ink-muted py-8">Sin usuarios</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold text-sm text-ink">{u.name}</td>
                  <td className="text-sm text-ink-2">{u.email}</td>
                  <td>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                      {u.role}
                    </span>
                  </td>
                  <td className="text-xs text-ink-muted">{new Date(u.created_at).toLocaleDateString("es-MX")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

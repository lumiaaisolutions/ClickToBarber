"use client";

import { useEffect, useState, useTransition } from "react";
import { Crown, Loader2, Check, AlertTriangle } from "lucide-react";
import { fmtCents, cn } from "@/lib/utils";

interface Plan {
  id: number;
  name: string;
  price_cents: number;
  currency: string;
  included_services_per_month: number;
}

interface Current {
  id: number;
  plan_name: string | null;
  plan_id: number | null;
  services_used_this_period: number;
  services_included: number | null;
  current_period_ends_on: string | null;
  status: string;
}

interface ApiData {
  tenant: { slug: string; name: string };
  plans: Plan[];
  current: Current | null;
}

export function MembershipsSection({
  token,
  flash,
}: { token: string; flash: "success" | "cancelled" | null }) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/me/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: ApiData) => setData(d))
      .catch(() => setError("No pudimos cargar las membresías."))
      .finally(() => setLoading(false));
  }, [token]);

  function subscribe(membershipId: number) {
    setCheckoutErr(null);
    startTransition(async () => {
      const res = await fetch("/api/public/me/memberships/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, membership_id: membershipId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.url) {
          window.location.href = json.url as string;
          return;
        }
      } else if (res.status === 409) {
        setCheckoutErr("Ya tienes una membresía activa.");
      } else if (res.status === 404) {
        setCheckoutErr("Ese plan ya no está disponible.");
      } else if (res.status === 502) {
        setCheckoutErr("La pasarela de pago no respondió.");
      } else {
        setCheckoutErr("No se pudo iniciar el checkout.");
      }
    });
  }

  if (loading) {
    return (
      <section className="mb-10">
        <Heading />
        <div className="card-paper p-6 flex items-center gap-2 text-ink-muted text-sm">
          <Loader2 size={14} className="animate-spin" /> Cargando…
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="mb-10">
        <Heading />
        <div className="card-paper p-6 text-sm text-ink-muted">{error ?? "Sin datos."}</div>
      </section>
    );
  }

  if (data.plans.length === 0 && !data.current) {
    return null; // Tenant sin membresías configuradas — no mostramos sección.
  }

  return (
    <section className="mb-10">
      <Heading />

      {flash === "success" && (
        <div className="card-paper p-4 border-success/30 text-success text-sm flex items-center gap-2 mb-3">
          <Check size={14} /> Suscripción activada. Disfruta tus servicios incluidos.
        </div>
      )}
      {flash === "cancelled" && (
        <div className="card-paper p-4 border-warning/30 text-warning text-sm flex items-center gap-2 mb-3">
          <AlertTriangle size={14} /> Cancelaste el checkout. Puedes intentarlo de nuevo cuando quieras.
        </div>
      )}

      {data.current ? (
        <CurrentBlock current={data.current} />
      ) : (
        <p className="text-sm text-ink-2 mb-4 leading-relaxed">
          Suscríbete a uno de los planes mensuales de {data.tenant.name} y
          paga menos por cada visita. Cancelas cuando quieras.
        </p>
      )}

      {!data.current && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSubscribe={() => subscribe(plan.id)}
              pending={pending}
            />
          ))}
        </div>
      )}

      {checkoutErr && (
        <p className="text-sm text-danger mt-3 flex items-center gap-1">
          <AlertTriangle size={13} /> {checkoutErr}
        </p>
      )}
    </section>
  );
}

function Heading() {
  return (
    <h2 className="font-display italic text-xl text-ink mb-3 flex items-center gap-2">
      <Crown size={16} className="text-accent-3" /> Membresías
    </h2>
  );
}

function CurrentBlock({ current }: { current: Current }) {
  const remaining = current.services_included
    ? Math.max(0, current.services_included - current.services_used_this_period)
    : null;

  return (
    <div className="card-paper p-5 sm:p-6 border-primary/40 bg-primary/5 mb-2">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] tracking-imperial text-primary mb-1">Membresía activa</div>
          <div className="font-display italic text-2xl text-ink">{current.plan_name ?? "Plan"}</div>
        </div>
        <span className="text-[10px] tracking-imperial bg-success/15 text-success px-3 py-1 rounded-full uppercase">
          {current.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-[10px] tracking-imperial text-ink-muted">Servicios usados</div>
          <div className="font-mono text-lg text-ink">
            {current.services_used_this_period}
            {current.services_included !== null && (
              <span className="text-ink-muted"> / {current.services_included}</span>
            )}
          </div>
          {remaining !== null && remaining > 0 && (
            <div className="text-[11px] text-ink-2">{remaining} restantes este periodo</div>
          )}
        </div>
        {current.current_period_ends_on && (
          <div>
            <div className="text-[10px] tracking-imperial text-ink-muted">Próxima renovación</div>
            <div className="text-ink">
              {new Date(current.current_period_ends_on).toLocaleDateString("es-MX", { day: "2-digit", month: "long" })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanCard({ plan, onSubscribe, pending }: { plan: Plan; onSubscribe: () => void; pending: boolean }) {
  return (
    <div className="card-paper p-5 sm:p-6 flex flex-col">
      <div className="font-display italic text-xl text-ink">{plan.name}</div>
      <div className="font-display text-3xl text-primary mt-2">
        {fmtCents(plan.price_cents, plan.currency)}
        <span className="text-sm text-ink-muted font-sans normal-case"> /mes</span>
      </div>
      <div className="text-sm text-ink-2 mt-2 mb-5">
        {plan.included_services_per_month} servicio{plan.included_services_per_month !== 1 && "s"} incluido{plan.included_services_per_month !== 1 && "s"} cada mes
      </div>
      <button
        type="button"
        onClick={onSubscribe}
        disabled={pending}
        className={cn("btn btn-primary justify-center mt-auto disabled:opacity-50")}
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        Suscribirme
      </button>
    </div>
  );
}

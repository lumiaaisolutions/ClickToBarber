"use client";

import { Calendar, Star, Sparkles, DollarSign, MapPin } from "lucide-react";
import { fmtCents, fmtDateTime, cn } from "@/lib/utils";

interface Timeline {
  client: { id: number; name: string; email: string; phone: string | null };
  stats: {
    total_visits: number;
    total_spent_cents: number;
    first_visit: string | null;
    last_visit: string | null;
    favorite_barber: number | null;
    visits_credited: number;
  };
  appointments: Array<{
    id: number; starts_at: string; status: string;
    service: string | null; barber: string | null; price_cents: number;
  }>;
  rewards: Array<{ code: string; reward_type: string; reward_value: number; issued_at: string; redeemed_at: string | null; expires_at: string | null }>;
  ratings: Array<{ stars: number; comment: string | null; submitted_at: string }>;
}

export function ClientTimelineClient({ initial }: { initial: Timeline }) {
  const { client, stats, appointments, rewards, ratings } = initial;

  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Cliente</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">{client.name}</h1>
        <p className="text-sm text-ink-muted mt-1 font-mono">{client.email}{client.phone ? ` · ${client.phone}` : ""}</p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Kpi icon={<Calendar size={14} />} label="Visitas" value={stats.total_visits} />
        <Kpi icon={<DollarSign size={14} />} label="Gastado" value={fmtCents(stats.total_spent_cents, "MXN")} />
        <Kpi icon={<Sparkles size={14} />} label="Acreditadas" value={stats.visits_credited} />
        <Kpi icon={<MapPin size={14} />} label="Cliente desde" value={stats.first_visit ? new Date(stats.first_visit).getFullYear().toString() : "—"} />
      </div>

      <section>
        <h2 className="font-display italic text-xl sm:text-2xl text-ink mb-3">Línea de tiempo</h2>
        {appointments.length === 0 ? (
          <div className="text-sm text-ink-muted">Sin citas registradas.</div>
        ) : (
          <ol className="relative border-l-2 border-line-medium ml-3 pl-5 space-y-4">
            {appointments.map((a) => (
              <li key={a.id} className="relative">
                <span className={cn(
                  "absolute -left-[27px] w-3 h-3 rounded-full border-2 border-bg-canvas",
                  a.status === "completed" && "bg-success",
                  a.status === "confirmed" && "bg-primary",
                  a.status === "cancelled" && "bg-danger",
                  a.status === "no_show" && "bg-warning",
                  !["completed","confirmed","cancelled","no_show"].includes(a.status) && "bg-ink-muted",
                )} />
                <div className="card-paper p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
                    <div className="font-display italic text-ink">{a.service ?? "Servicio"}</div>
                    <div className="text-xs font-mono text-ink-muted">{fmtDateTime(a.starts_at)}</div>
                  </div>
                  <div className="text-xs text-ink-2 mt-1">
                    {a.barber ?? "—"} · <span className="text-ink-muted">{a.status}</span> · {fmtCents(a.price_cents, "MXN")}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {rewards.length > 0 && (
        <section>
          <h2 className="font-display italic text-xl sm:text-2xl text-ink mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-accent-3" /> Recompensas
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rewards.map((r, i) => (
              <li key={i} className="card-paper p-4">
                <div className="font-mono text-primary">{r.code}</div>
                <div className="text-xs text-ink-2 mt-1">
                  {r.reward_type === "free_service" ? "Servicio gratis" : `${r.reward_value}% off`}
                  {r.redeemed_at && <span className="text-ink-muted ml-2">· redimida</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ratings.length > 0 && (
        <section>
          <h2 className="font-display italic text-xl sm:text-2xl text-ink mb-3 flex items-center gap-2">
            <Star size={16} className="text-accent-3" /> Reseñas dejadas
          </h2>
          <ul className="space-y-2">
            {ratings.map((r, i) => (
              <li key={i} className="card-paper p-4">
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} size={11} strokeWidth={1.5} className={cn(s <= r.stars ? "text-accent fill-accent" : "text-ink-muted")} />
                  ))}
                </div>
                {r.comment && <p className="text-sm text-ink-2 leading-relaxed">{r.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="card-paper p-3 sm:p-4">
      <div className="text-[10px] tracking-imperial text-ink-muted flex items-center gap-1.5">{icon} {label}</div>
      <div className="font-display italic text-xl sm:text-2xl text-ink tabular-nums mt-1 break-words">{value}</div>
    </div>
  );
}

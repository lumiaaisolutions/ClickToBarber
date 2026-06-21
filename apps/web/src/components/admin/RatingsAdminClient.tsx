"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

interface Rating {
  id: number; stars: number; comment: string | null; is_published: boolean;
  client: string | null; barber: string | null; submitted_at: string | null;
}

export function RatingsAdminClient({
  initial,
}: { initial: { stats: { avg: number | null; count: number; positive: number; negative: number }; ratings: Rating[] } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle(id: number, publish: boolean) {
    startTransition(async () => {
      await fetch(`/api/admin/ratings/${id}/${publish ? "publish" : "unpublish"}`, { method: "POST" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Reputación</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Calificaciones</h1>
        <p className="text-ink-2 text-sm mt-3 max-w-xl leading-relaxed">
          Reviews post-visita. Por defecto publicamos solo 4★+; revisa las
          negativas y publícalas manualmente si están justificadas.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Kpi label="Promedio" value={initial.stats.avg !== null ? initial.stats.avg.toFixed(1) : "—"} suffix="★" />
        <Kpi label="Total" value={initial.stats.count} />
        <Kpi label="Positivas (4★+)" value={initial.stats.positive} tone="success" />
        <Kpi label="Negativas (1-3★)" value={initial.stats.negative} tone="warning" />
      </div>

      {initial.ratings.length === 0 ? (
        <EmptyState icon={<Star size={20} />} title="Sin reviews todavía" description="Cada cita completada genera un link único de calificación al cliente." />
      ) : (
        <ul className="space-y-3">
          {initial.ratings.map((r) => (
            <li key={r.id} className="card-paper p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={13} strokeWidth={1.5} className={cn(s <= r.stars ? "text-accent fill-accent" : "text-ink-muted")} />
                    ))}
                    <span className="text-xs text-ink-muted ml-2">
                      {r.client ?? "anónimo"} · {r.barber ?? "—"}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-ink-2 leading-relaxed">{r.comment}</p>}
                  <div className="text-[11px] text-ink-muted mt-2">
                    {r.submitted_at ? new Date(r.submitted_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "text-[10px] tracking-imperial px-2 py-0.5 rounded-full",
                    r.is_published ? "bg-success/15 text-success border border-success/30" : "bg-bg-vellum text-ink-muted border border-line-medium",
                  )}>
                    {r.is_published ? "Publicada" : "Oculta"}
                  </span>
                  <button onClick={() => toggle(r.id, !r.is_published)} disabled={pending} className="btn btn-ghost text-xs py-1 px-2.5">
                    {pending ? <Loader2 size={11} className="animate-spin" /> : (r.is_published ? <EyeOff size={11} /> : <Eye size={11} />)}
                    {r.is_published ? "Ocultar" : "Publicar"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Kpi({ label, value, suffix, tone }: { label: string; value: string | number; suffix?: string; tone?: "success" | "warning" }) {
  return (
    <div className="card-paper p-3 sm:p-5">
      <div className="text-[10px] tracking-imperial text-ink-muted">{label}</div>
      <div className={cn(
        "font-display italic text-2xl sm:text-3xl tabular-nums mt-1",
        tone === "success" && "text-success",
        tone === "warning" && "text-warning",
        !tone && "text-ink",
      )}>{value}{suffix && <span className="text-ink-muted ml-0.5">{suffix}</span>}</div>
    </div>
  );
}

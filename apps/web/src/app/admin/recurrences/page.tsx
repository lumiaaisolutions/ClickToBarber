import { Repeat } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Citas recurrentes — LUMIA" };

export default function RecurrencesPage() {
  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Operación</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Citas recurrentes</h1>
        <p className="text-ink-2 text-sm mt-3 leading-relaxed">
          Cliente con suscripción ("todos los 1ros sábados a las 10"). El job{" "}
          <code className="font-mono text-primary">lumia:materialize-recurrences</code>{" "}
          materializa las próximas 21 días automáticamente cada noche.
        </p>
      </header>

      <EmptyState
        icon={<Repeat size={20} />}
        title="UI en construcción"
        description="Por ahora puedes crear y consultar series recurrentes vía API o tinker. La UI de gestión completa está en el roadmap inmediato (ver docs/RECURRING.md)."
      />

      <div className="card-paper p-5 sm:p-6 text-sm text-ink-2 space-y-3">
        <h3 className="font-display italic text-lg text-ink">Cómo crear una serie por API</h3>
        <pre className="bg-bg-vellum border border-line-fine rounded-[8px] p-3 overflow-x-auto text-xs font-mono leading-relaxed">
{`POST /api/admin/recurrences
{
  "user_id": 42,
  "barber_id": 3,
  "service_id": 1,
  "frequency": "weekly",
  "weekday": 6,
  "time_local": "10:00",
  "starts_on": "2026-06-01"
}`}
        </pre>
      </div>
    </div>
  );
}

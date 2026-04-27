import { getServicesAdmin } from "@/lib/admin-api";
import { Clock } from "lucide-react";
import { fmtCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await getServicesAdmin();

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">Catálogo</div>
        <h1 className="font-display text-4xl">Servicios</h1>
        <p className="text-text-2 text-sm mt-1">{services.length} servicios activos.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => (
          <div key={s.id} className="card-premium p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-lg">{s.name}</h2>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${s.is_active ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                {s.is_active ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p className="text-sm text-text-2 mt-2 min-h-[40px]">{s.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-text-muted inline-flex items-center gap-1">
                <Clock size={12} /> {s.duration_minutes} min
              </span>
              <span className="font-display text-2xl text-accent tabular-nums">{fmtCents(s.price_cents, s.currency)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

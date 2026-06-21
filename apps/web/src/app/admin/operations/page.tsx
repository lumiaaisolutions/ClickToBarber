import { ScrollText, DollarSign, Coins } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Operación — LUMIA" };

/**
 * Hub de operación: POS, cierre de caja, tip splitting.
 * Las tablas backend existen (`tickets`, `cash_closes`, `tip_splits`);
 * la UI completa de cada flujo viene en el siguiente sprint.
 */
export default function OperationsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Día a día</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Operación</h1>
        <p className="text-ink-2 text-sm mt-3 leading-relaxed">
          POS, propinas, cierre de caja. Los modelos de datos existen y los
          endpoints REST están parcialmente listos — la UI completa se prioriza
          en el siguiente sprint.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card icon={<ScrollText size={18} />} title="POS / Tickets" desc="Cobra servicios + productos en un solo ticket. Aplica cupón y reparte la propina entre barberos." />
        <Card icon={<Coins size={18} />} title="Tip splitting" desc="División automática de propinas multi-barbero — la tabla ya guarda los splits cuando un Ticket se cierra." />
        <Card icon={<DollarSign size={18} />} title="Cierre de caja" desc="Resumen diario por barbero (efectivo vs digital, comisiones, propinas)." />
      </div>

      <EmptyState
        icon={<ScrollText size={20} />}
        title="UIs en sprint inmediato"
        description="Los modelos están en docs/POS.md. Hoy puedes registrar POS y cierres vía Tinker o API directa."
      />
    </div>
  );
}

function Card({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card-paper p-5">
      <div className="w-10 h-10 rounded-full bg-primary/8 text-primary flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-display italic text-lg text-ink mb-1">{title}</h3>
      <p className="text-xs text-ink-2 leading-relaxed">{desc}</p>
    </div>
  );
}

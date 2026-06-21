"use client";

import { Sparkles, Package, AlertTriangle } from "lucide-react";
import { cn, fmtCents, WEEKDAYS_ES } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

interface SmartSlots {
  period_weeks: number;
  suggestions: Array<{ barber_id: number; weekday: number; hour: number; visits_8w: number }>;
}

interface StockForecast {
  forecast: Array<{
    id: number; name: string; sku: string;
    stock: number; stock_min: number;
    sold_last_30d: number; per_day_avg: number;
    days_until_stockout: number | null; reorder_now: boolean;
  }>;
}

export function InsightsClient({
  smart, stock,
}: {
  smart: SmartSlots | null;
  stock: StockForecast | null;
}) {
  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Inteligencia</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Insights</h1>
        <p className="text-ink-2 text-sm mt-3 max-w-xl leading-relaxed">
          Análisis automático de tus datos: huecos en agenda y predicción de stock.
        </p>
      </header>

      {/* Smart slots */}
      <section>
        <h2 className="font-display italic text-xl sm:text-2xl text-ink mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-accent-3" />
          Huecos en agenda — últimas {smart?.period_weeks ?? 8} semanas
        </h2>
        <p className="text-sm text-ink-2 mb-4 max-w-xl">
          Slots con menos visitas registradas. Promueve estos horarios con cupones o WhatsApp blast.
        </p>
        {!smart || smart.suggestions.length === 0 ? (
          <EmptyState icon={<Sparkles size={20} />} title="Sin datos suficientes" description="Necesitamos al menos 8 semanas de historial." />
        ) : (
          <div className="card-paper overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[480px] w-full text-sm">
                <thead className="text-[10px] uppercase tracking-imperial text-ink-muted">
                  <tr className="border-b border-line-fine">
                    <th className="text-left px-4 sm:px-6 py-3">Barbero</th>
                    <th className="text-left px-3 py-3">Día</th>
                    <th className="text-left px-3 py-3">Hora</th>
                    <th className="text-right px-4 sm:px-6 py-3">Visitas (8 sem)</th>
                  </tr>
                </thead>
                <tbody>
                  {smart.suggestions.map((s, i) => (
                    <tr key={i} className="border-b border-line-fine last:border-0">
                      <td className="px-4 sm:px-6 py-3 font-mono text-xs">#{s.barber_id}</td>
                      <td className="px-3 py-3 font-display italic text-ink">{WEEKDAYS_ES[s.weekday]}</td>
                      <td className="px-3 py-3 font-mono">{s.hour.toString().padStart(2, "0")}:00</td>
                      <td className="px-4 sm:px-6 py-3 text-right tabular-nums text-ink-2">{s.visits_8w}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Stock forecast */}
      <section>
        <h2 className="font-display italic text-xl sm:text-2xl text-ink mb-3 flex items-center gap-2">
          <Package size={18} className="text-accent-3" />
          Predicción de stock
        </h2>
        <p className="text-sm text-ink-2 mb-4 max-w-xl">
          Velocidad media de salida × stock actual = días hasta stockout. <strong>Reordena</strong>{" "}
          los marcados con <AlertTriangle size={11} className="inline text-warning" />.
        </p>
        {!stock || stock.forecast.length === 0 ? (
          <EmptyState
            icon={<Package size={20} />}
            title="Sin productos"
            description="Cuando tengas POS activo y productos en inventario, verás predicciones aquí."
          />
        ) : (
          <div className="card-paper overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-sm">
                <thead className="text-[10px] uppercase tracking-imperial text-ink-muted">
                  <tr className="border-b border-line-fine">
                    <th className="text-left px-4 sm:px-6 py-3">Producto</th>
                    <th className="text-right px-3 py-3">Stock</th>
                    <th className="text-right px-3 py-3">Venta/día</th>
                    <th className="text-right px-3 py-3">Días</th>
                    <th className="text-left px-4 sm:px-6 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.forecast.map((p) => (
                    <tr key={p.id} className={cn("border-b border-line-fine last:border-0", p.reorder_now && "bg-warning/5")}>
                      <td className="px-4 sm:px-6 py-3">
                        <div className="font-display italic text-ink">{p.name}</div>
                        <div className="font-mono text-xs text-ink-muted">{p.sku}</div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        <span className={cn(p.stock <= p.stock_min && "text-warning")}>{p.stock}</span>
                        <span className="text-ink-muted text-xs"> / min {p.stock_min}</span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink-2">{p.per_day_avg.toFixed(1)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {p.days_until_stockout === null ? "∞" : p.days_until_stockout}
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        {p.reorder_now ? (
                          <span className="inline-flex items-center gap-1 text-[10px] tracking-imperial bg-warning/15 text-warning border border-warning/30 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={10} /> Reordenar
                          </span>
                        ) : (
                          <span className="text-xs text-ink-muted">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

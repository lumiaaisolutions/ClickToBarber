import { getDashboard, getProductsAdmin } from "@/lib/admin-api";
import { FeatureGate } from "@/components/FeatureGate";
import { fmtCents } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  const dash = await getDashboard().catch(() => null);
  const enabled = dash?.features.includes("pos_inventory") ?? false;

  let products: Awaited<ReturnType<typeof getProductsAdmin>> = [];
  if (enabled) {
    try { products = await getProductsAdmin(); } catch {}
  } else {
    products = MOCK_PRODUCTS;
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">POS · Inventario</div>
        <h1 className="font-display text-4xl">Productos</h1>
        <p className="text-text-2 text-sm mt-1">Cobra productos junto con servicios y mantén el stock al día.</p>
      </header>

      <FeatureGate
        feature="pos_inventory"
        enabled={enabled}
        requiredPlan={dash ? "Pro" : null}
        upgradeHref="/admin/billing"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className="card-premium p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg">{p.name}</h2>
                  <div className="text-xs text-text-muted font-mono mt-1">{p.sku}</div>
                </div>
                {p.low_stock && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30">
                    <AlertTriangle size={10} /> Bajo stock
                  </span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider">Precio</div>
                  <div className="font-display text-xl text-accent tabular-nums">{fmtCents(p.price_cents, p.currency)}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider">Stock</div>
                  <div className="font-display text-xl tabular-nums">
                    {p.stock} <span className="text-text-muted text-xs">/ min {p.stock_min}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </FeatureGate>
    </div>
  );
}

const MOCK_PRODUCTS = [
  { id: 1, name: "Pomada Mate Pro",   sku: "POM-001", price_cents: 32000, currency: "MXN", stock: 24, stock_min: 5, low_stock: false, is_active: true },
  { id: 2, name: "Aceite para barba", sku: "OIL-001", price_cents: 28000, currency: "MXN", stock: 18, stock_min: 5, low_stock: false, is_active: true },
  { id: 3, name: "Cera fijación",     sku: "WAX-001", price_cents: 35000, currency: "MXN", stock:  3, stock_min: 4, low_stock: true,  is_active: true },
];

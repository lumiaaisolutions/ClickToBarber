import { getDashboard, getProductsAdmin, getMe } from "@/lib/admin-api";
import { FeatureGate } from "@/components/FeatureGate";
import { ProductsClient } from "@/components/admin/ProductsClient";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  const [dash, me] = await Promise.all([
    getDashboard().catch(() => null),
    getMe().catch(() => null),
  ]);
  const enabled = dash?.features.includes("pos_inventory") ?? false;
  const canWrite = me?.user.can_write ?? false;

  let products: Awaited<ReturnType<typeof getProductsAdmin>> = [];
  if (enabled) {
    try {
      products = await getProductsAdmin();
    } catch {
      products = [];
    }
  } else {
    products = MOCK_PRODUCTS;
  }

  return (
    <FeatureGate
      feature="pos_inventory"
      enabled={enabled}
      requiredPlan={dash ? "Pro" : null}
      upgradeHref="/admin/billing"
    >
      <ProductsClient initial={products} canWrite={canWrite && enabled} />
    </FeatureGate>
  );
}

const MOCK_PRODUCTS = [
  {
    id: 1,
    name: "Pomada Mate Pro",
    sku: "POM-001",
    description: "Fijación media, acabado mate.",
    price_cents: 32000,
    cost_cents: 14000,
    currency: "MXN",
    stock: 24,
    stock_min: 5,
    low_stock: false,
    is_active: true,
  },
  {
    id: 2,
    name: "Aceite para barba",
    sku: "OIL-001",
    description: "Hidratación y brillo natural.",
    price_cents: 28000,
    cost_cents: 12000,
    currency: "MXN",
    stock: 18,
    stock_min: 5,
    low_stock: false,
    is_active: true,
  },
  {
    id: 3,
    name: "Cera fijación",
    sku: "WAX-001",
    description: "Fijación fuerte, secado rápido.",
    price_cents: 35000,
    cost_cents: 16000,
    currency: "MXN",
    stock: 3,
    stock_min: 4,
    low_stock: true,
    is_active: true,
  },
];

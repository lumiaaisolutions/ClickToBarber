import { api } from "@/lib/api";
import { PosCheckoutClient } from "@/components/admin/PosCheckoutClient";

export const dynamic = "force-dynamic";

interface Service { id: number; name: string; price_cents: number; }
interface Product { id: number; name: string; sku: string; price_cents: number; stock: number; }
interface Barber { id: number; name: string; }

export default async function PosCheckoutPage() {
  const [services, products, staff] = await Promise.all([
    api<Service[]>("/admin/catalog/services", { authed: true }).catch(() => []),
    api<Product[]>("/admin/catalog/products", { authed: true }).catch(() => []),
    api<Barber[]>("/admin/staff", { authed: true }).catch(() => []),
  ]);
  return <PosCheckoutClient services={services} products={products} barbers={staff} />;
}

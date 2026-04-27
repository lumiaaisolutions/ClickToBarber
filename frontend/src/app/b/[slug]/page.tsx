import { notFound } from "next/navigation";
import { api, type PublicTenant, type PublicBarber, type PublicService } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { TenantHero } from "@/components/client/TenantHero";
import { BookingFlow } from "@/components/client/BookingFlow";

export const dynamic = "force-dynamic";

interface PublicTenantResponse {
  tenant: PublicTenant;
  barbers: PublicBarber[];
  services: PublicService[];
}

export default async function TenantPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let data: PublicTenantResponse;

  try {
    data = await api<PublicTenantResponse>(`/client/tenants/${slug}`);
  } catch {
    notFound();
  }

  return (
    <>
      <Navbar />
      <main className="relative z-10">
        <TenantHero tenant={data.tenant} />
        <BookingFlow tenant={data.tenant} barbers={data.barbers} services={data.services} />
      </main>
    </>
  );
}

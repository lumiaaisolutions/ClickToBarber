import { notFound } from "next/navigation";
import { api, type PublicTenant, type PublicBarber, type PublicService } from "@/lib/api";
import { TenantHero } from "@/components/client/TenantHero";
import { BookingFlow } from "@/components/client/BookingFlow";
import { BrandingProvider } from "@/components/branding/BrandingProvider";
import { fetchPublicBranding, FALLBACK_BRANDING } from "@/lib/branding-api";
import { Logo } from "@/components/Logo";

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

  const branding = (await fetchPublicBranding(slug)) ?? FALLBACK_BRANDING;

  return (
    <BrandingProvider branding={branding}>
      <main className="relative z-10 min-h-screen">
        <TenantHero tenant={data.tenant} branding={branding} />
        <BookingFlow tenant={data.tenant} barbers={data.barbers} services={data.services} />

        {/* Powered by LUMIA — pie sello, NUNCA personalizable por tenant */}
        <footer className="mt-24 pt-10 pb-8 border-t border-line-fine">
          <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-ink-muted italic">
              © {new Date().getFullYear()} {data.tenant.name}. Todos los derechos reservados.
            </div>
            <a
              href="https://lumiaaisolutions.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-ink-muted hover:text-primary transition-colors duration-500 group"
            >
              <span className="text-[10px] tracking-imperial">Powered by</span>
              <span className="text-primary group-hover:opacity-90">
                <Logo size={20} />
              </span>
            </a>
          </div>
        </footer>
      </main>
    </BrandingProvider>
  );
}

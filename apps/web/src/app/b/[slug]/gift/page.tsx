import { notFound } from "next/navigation";
import { api, type PublicTenant } from "@/lib/api";
import { BrandingProvider } from "@/components/branding/BrandingProvider";
import { fetchPublicBranding, FALLBACK_BRANDING } from "@/lib/branding-api";
import { GiftCardCheckoutClient } from "@/components/client/GiftCardCheckoutClient";
import { Logo } from "@/components/Logo";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Regalar una gift card" };

export default async function GiftCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let tenant: PublicTenant;
  try {
    const data = await api<{ tenant: PublicTenant }>(`/client/tenants/${slug}`);
    tenant = data.tenant;
  } catch {
    notFound();
  }

  const branding = (await fetchPublicBranding(slug)) ?? FALLBACK_BRANDING;

  return (
    <BrandingProvider branding={branding}>
      <main className="relative z-10 min-h-screen bg-bg-canvas">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <Link href={`/b/${slug}`} className="inline-flex items-center gap-2 text-ink-muted hover:text-primary text-xs tracking-imperial mb-8">
            ← Volver a {tenant.name}
          </Link>

          <header className="mb-8 sm:mb-10">
            <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Gift card</div>
            <h1 className="font-display italic text-4xl sm:text-5xl text-ink leading-tight">
              Regala una experiencia
            </h1>
            <p className="text-ink-2 mt-3 max-w-xl leading-relaxed">
              Una gift card de {tenant.name} es un detalle elegante que tu
              persona favorita puede canjear en cualquiera de nuestros
              servicios durante un año.
            </p>
          </header>

          <GiftCardCheckoutClient slug={slug} tenantName={tenant.name} />

          <footer className="mt-16 pt-8 border-t border-line-fine flex items-center justify-between text-xs text-ink-muted">
            <span>Pago procesado de forma segura.</span>
            <a href="https://lumiaaisolutions.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-primary transition">
              <span className="tracking-imperial">Powered by</span>
              <Logo size={18} />
            </a>
          </footer>
        </div>
      </main>
    </BrandingProvider>
  );
}

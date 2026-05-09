import Link from "next/link";
import { notFound } from "next/navigation";
import { Gift, Mail, ArrowRight } from "lucide-react";
import { api, type PublicTenant } from "@/lib/api";
import { BrandingProvider } from "@/components/branding/BrandingProvider";
import { fetchPublicBranding, FALLBACK_BRANDING } from "@/lib/branding-api";
import { Logo } from "@/components/Logo";
import { fmtCents } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "¡Listo! · Gift card" };

interface GiftLookup {
  code: string;
  value_cents: number;
  balance_cents: number;
  currency: string;
  recipient_name: string | null;
  expires_at: string | null;
  usable: boolean;
}

export default async function GiftSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { slug } = await params;
  const { code } = await searchParams;

  let tenant: PublicTenant;
  try {
    const data = await api<{ tenant: PublicTenant }>(`/client/tenants/${slug}`);
    tenant = data.tenant;
  } catch {
    notFound();
  }

  const branding = (await fetchPublicBranding(slug)) ?? FALLBACK_BRANDING;

  let card: GiftLookup | null = null;
  if (code) {
    card = await api<GiftLookup>(`/public/giftcards/${slug}/${code}`).catch(() => null);
  }

  return (
    <BrandingProvider branding={branding}>
      <main className="relative z-10 min-h-screen bg-bg-canvas flex flex-col items-center justify-center px-4 sm:px-6 py-16">
        <div className="max-w-xl w-full text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mb-6">
            <Gift size={26} className="text-success" />
          </div>

          <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Pago confirmado</div>
          <h1 className="font-display italic text-4xl sm:text-5xl text-ink leading-tight mb-4">
            Tu gift card está en camino
          </h1>
          <p className="text-ink-2 leading-relaxed mb-8">
            {card?.recipient_name ? <strong>{card.recipient_name}</strong> : "La persona que indicaste"} recibirá
            un correo con el código y las instrucciones para canjearla en
            {" "}{tenant.name}.
          </p>

          {card && (
            <div className="card-paper p-6 sm:p-8 text-left mb-8">
              <div className="text-[10px] tracking-imperial text-ink-muted mb-1">Código</div>
              <div className="font-mono text-xl sm:text-2xl text-primary tracking-wide mb-4 select-all">{card.code}</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[10px] tracking-imperial text-ink-muted">Valor</div>
                  <div className="font-display text-xl text-ink">{fmtCents(card.value_cents)}</div>
                </div>
                {card.expires_at && (
                  <div>
                    <div className="text-[10px] tracking-imperial text-ink-muted">Vence</div>
                    <div className="text-ink">
                      {new Date(card.expires_at).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/b/${slug}`} className="btn btn-primary justify-center">
              <ArrowRight size={14} /> Ver {tenant.name}
            </Link>
            <Link href={`/b/${slug}/gift`} className="btn btn-ghost justify-center">
              <Mail size={14} /> Comprar otra
            </Link>
          </div>

          <footer className="mt-16 pt-8 border-t border-line-fine flex items-center justify-center gap-2 text-xs text-ink-muted">
            <span className="tracking-imperial">Powered by</span>
            <Logo size={16} />
          </footer>
        </div>
      </main>
    </BrandingProvider>
  );
}

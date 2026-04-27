import { Navbar } from "@/components/Navbar";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingHorizontalScroll } from "@/components/landing/LandingHorizontalScroll";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { api, Plan } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let plans: Plan[] = [];
  try {
    plans = await api<Plan[]>("/billing/plans");
  } catch {
    // Si el backend no está arriba, mostramos un fallback estático
    plans = FALLBACK_PLANS;
  }

  return (
    <>
      <Navbar />
      <main className="relative z-10">
        <LandingHero />
        <LandingFeatures />
        <LandingHorizontalScroll />
        <LandingPricing plans={plans} />
        <LandingFooter />
      </main>
    </>
  );
}

const FALLBACK_PLANS: Plan[] = [
  { code: "free",       name: "Free",       description: "Empieza gratis con agenda básica para 1 barbero.", price_cents: 0,      price: "$0 MXN",     features: ["online_booking"], max_barbers: 1 },
  { code: "starter",    name: "Starter",    description: "Hasta 5 barberos + WhatsApp.",                     price_cents: 49900,  price: "$499 MXN",   features: ["online_booking","multi_barbers","whatsapp"], max_barbers: 5 },
  { code: "pro",        name: "Pro",        description: "POS, marketing, anti no-show completo.",           price_cents: 99900,  price: "$999 MXN",   features: ["pos_inventory","marketing_retention","twilio_voice"], max_barbers: null },
  { code: "enterprise", name: "Enterprise", description: "Multi-sucursal y API.",                            price_cents: 199900, price: "$1,999 MXN", features: ["multi_branch","public_api","finance_reports"], max_barbers: null },
];

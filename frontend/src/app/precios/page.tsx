import { Navbar } from "@/components/Navbar";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { api, Plan } from "@/lib/api";
import { Mail, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cotizar plan — LUMIA",
  description: "Elige tu plan LUMIA y cotiza para tu barbería. Cuatro presets old-money, identidad propia y soporte humano.",
};

export default async function PreciosPage() {
  let plans: Plan[] = [];
  try {
    plans = await api<Plan[]>("/billing/plans");
  } catch {
    plans = [];
  }

  return (
    <>
      <Navbar />
      <main className="relative z-10 pt-32">
        <section className="px-6 max-w-4xl mx-auto text-center mb-12">
          <div className="text-[10px] tracking-imperial text-accent-3 mb-4">Cotización</div>
          <h1 className="font-display italic text-[clamp(2.4rem,5.5vw,5rem)] leading-[1.02] text-ink">
            Encuentra tu <span className="text-emerald-grad">filo.</span>
          </h1>
          <p className="mt-6 text-ink-2 leading-relaxed">
            Selecciona un plan y nuestro equipo te contacta para activar tu cuenta. Una vez confirmado el
            pago, recibes credenciales y un wizard de identidad para personalizar tu portal.
          </p>
        </section>

        <LandingPricing plans={plans} />

        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto card-vellum p-10 text-center">
            <div className="text-[10px] tracking-imperial text-accent-3 mb-4">¿Necesitas otro flujo?</div>
            <h2 className="font-display italic text-3xl text-ink mb-3">Hablemos.</h2>
            <p className="text-ink-2 mb-8 leading-relaxed">
              Multi-sucursal, integraciones con tu sistema contable, dominios propios o algo único para tu cadena —
              te armamos un plan a la medida.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center text-sm">
              <a href="mailto:hola@lumiaaisolutions.com" className="btn btn-primary inline-flex items-center gap-2">
                <Mail size={15} /> hola@lumiaaisolutions.com
              </a>
              <a href="https://lumiaaisolutions.com" target="_blank" rel="noopener noreferrer" className="btn btn-ghost inline-flex items-center gap-2">
                <Phone size={15} /> Agendar demo
              </a>
            </div>
          </div>
        </section>

        <LandingFooter />
      </main>
    </>
  );
}

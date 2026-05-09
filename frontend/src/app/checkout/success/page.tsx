import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ConfettiOnMount } from "@/components/ui/ConfettiOnMount";

interface PageProps {
  searchParams: Promise<{ session_id?: string; mock?: string }>;
}

/**
 * /checkout/success — landing tras pago Stripe.
 *
 * En producción el flujo es:
 *   1) Usuario completa Checkout en stripe.com.
 *   2) Stripe redirige aquí con ?session_id=cs_xxx.
 *   3) Esta página solo confirma; el provisioning real ocurre por webhook
 *      (puede tardar unos segundos). El usuario recibe un email con
 *      magic link cuando el tenant esté listo.
 *   4) Si por algún motivo el email no llega en 5 min, hay un fallback
 *      "no recibí mi correo".
 */
export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const { session_id: sessionId, mock } = await searchParams;
  const isMock = mock === "1";

  return (
    <main className="min-h-screen bg-bg-canvas flex flex-col items-center justify-center px-6 py-16">
      <ConfettiOnMount />
      <div className="max-w-xl w-full text-center">
        <Logo className="mx-auto h-9 text-primary mb-12" />
        <div className="text-[10px] tracking-imperial text-accent-3 mb-4">Pago confirmado</div>
        <h1 className="font-display italic text-[clamp(2.4rem,6vw,4.5rem)] leading-[1.05] text-ink mb-8">
          Tu cuenta se está <span className="text-emerald-grad">activando.</span>
        </h1>
        <p className="text-ink-2 leading-relaxed mb-10 max-w-md mx-auto">
          Estamos generando tu tenant y enviándote un correo con el enlace
          seguro para terminar la configuración de tu barbería. Suele llegar
          en menos de un minuto.
        </p>

        {isMock && (
          <div className="mb-10 p-5 rounded-2xl border border-accent/40 bg-accent/5 text-left">
            <p className="text-xs tracking-imperial text-accent-3 mb-2">
              Modo demo
            </p>
            <p className="text-sm text-ink-2 leading-relaxed">
              Estás en una demo sin Stripe real. Para probar el flujo completo,
              configura <code className="text-accent-3">STRIPE_DRIVER=stripe</code> y
              las claves <code className="text-accent-3">STRIPE_SECRET</code> y
              <code className="text-accent-3">STRIPE_WEBHOOK_SECRET</code> en el backend.
            </p>
          </div>
        )}

        {sessionId && (
          <p className="text-xs text-ink-muted font-mono mb-10 break-all">
            ID de sesión: {sessionId}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn btn-ghost text-sm">
            Volver al inicio
          </Link>
          <a
            href="mailto:hola@lumiaaisolutions.com?subject=No%20recibí%20mi%20correo%20de%20activación"
            className="btn btn-ghost text-sm"
          >
            No recibí mi correo
          </a>
        </div>
      </div>
    </main>
  );
}

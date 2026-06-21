"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  planSlug: string;
  planName: string;
  billingCycle: "monthly" | "yearly";
  priceLabel: string;
}

/**
 * Modal de checkout — recoge email + nombre del negocio y arranca Stripe.
 *
 * Si el backend está en STRIPE_DRIVER=mock devuelve una URL fake con
 * ?mock=1 que la página /checkout/success interpreta como demo.
 */
export function CheckoutDialog({
  open,
  onClose,
  planSlug,
  planName,
  billingCycle,
  priceLabel,
}: Props) {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setLoading(false);
    }
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/public/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planSlug,
          billing_cycle: billingCycle,
          email: email.trim(),
          business_name: businessName.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setError(
          data?.errors?.email?.[0] ??
            data?.message ??
            "No pudimos iniciar el checkout. Inténtalo de nuevo.",
        );
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Error de red. Verifica tu conexión.");
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] bg-ink/60 backdrop-blur-sm flex items-center justify-center px-4 py-10 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-bg-canvas rounded-2xl p-6 sm:p-8 shadow-[0_40px_80px_-32px_rgba(31,61,43,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink transition-colors"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            <div className="text-[10px] tracking-imperial text-accent-3 mb-2">
              Plan {planName}
            </div>
            <h3 className="font-display italic text-3xl text-ink mb-1">
              Activa tu cuenta.
            </h3>
            <p className="text-sm text-ink-2 mb-6">
              {priceLabel} ·{" "}
              {billingCycle === "yearly" ? "Facturación anual" : "Facturación mensual"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs tracking-noble text-ink-2 mb-1.5">
                  Nombre de la barbería
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="input-boxed w-full"
                  placeholder="Ej. Marfil Avenue"
                />
              </div>
              <div>
                <label className="block text-xs tracking-noble text-ink-2 mb-1.5">
                  Email del administrador
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-boxed w-full"
                  placeholder="tu@correo.com"
                />
                <p className="text-[11px] text-ink-muted mt-1.5 leading-snug">
                  Usaremos este correo para enviarte el enlace seguro de
                  activación tras confirmar el pago.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full justify-center mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Conectando con Stripe…
                  </>
                ) : (
                  <>
                    Continuar al pago <ArrowRight size={14} />
                  </>
                )}
              </button>

              <p className="text-[11px] text-ink-muted text-center pt-2 leading-relaxed">
                Pago seguro vía Stripe. Sin permanencia. Cancela cuando quieras.
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

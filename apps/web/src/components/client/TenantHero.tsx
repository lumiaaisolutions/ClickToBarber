"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Star } from "lucide-react";
import type { PublicTenant } from "@/lib/api";
import type { TenantBranding } from "@/components/branding/BrandingProvider";

export function TenantHero({ tenant, branding }: { tenant: PublicTenant; branding?: TenantBranding | null }) {
  const tagline = branding?.public_tagline;
  return (
    <section className="relative pt-20 sm:pt-32 pb-10 sm:pb-16 px-4 sm:px-6 overflow-hidden">
      {tenant.cover_image && (
        <div
          className="absolute inset-0 -z-10 opacity-22"
          style={{
            backgroundImage: `linear-gradient(180deg, transparent 0%, var(--bg-canvas) 78%), url(${tenant.cover_image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <div className="max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-[10px] tracking-imperial text-accent-3 mb-3 sm:mb-4">Reserva online</div>
          <h1 className="font-display italic text-[clamp(2rem,7vw,6rem)] leading-[1.05] sm:leading-[1.02] text-ink break-words">
            {tenant.name}
          </h1>

          {tagline && (
            <p className="mt-4 sm:mt-5 max-w-xl mx-auto text-sm sm:text-base text-ink-2 italic font-display">
              {tagline}
            </p>
          )}

          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-7 gap-y-2 text-xs sm:text-sm text-ink-2">
            {tenant.address && (
              <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {tenant.address}</span>
            )}
            {tenant.phone && (
              <span className="inline-flex items-center gap-1.5"><Phone size={13} /> {tenant.phone}</span>
            )}
            <span className="inline-flex items-center gap-1.5 text-primary">
              <Star size={13} fill="currentColor" /> 4.9 (180 reseñas)
            </span>
          </div>

          <hr className="hairline-gold w-20 sm:w-24 mx-auto my-6 sm:my-8" />

          <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs text-ink-muted italic">
            Depósito de reserva:
            <span className="font-mono not-italic text-primary">{tenant.deposit_pct}%</span>
            del servicio para asegurar tu lugar.
          </div>
        </motion.div>
      </div>
    </section>
  );
}

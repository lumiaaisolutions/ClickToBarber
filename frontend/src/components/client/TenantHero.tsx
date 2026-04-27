"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Star } from "lucide-react";
import type { PublicTenant } from "@/lib/api";

export function TenantHero({ tenant }: { tenant: PublicTenant }) {
  return (
    <section className="relative pt-32 pb-12 px-6 overflow-hidden">
      {tenant.cover_image && (
        <div
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            backgroundImage: `linear-gradient(180deg, transparent 0%, var(--bg-void) 80%), url(${tenant.cover_image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <div className="max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Reserva online</div>
          <h1 className="font-display text-5xl sm:text-7xl tracking-tight">{tenant.name}</h1>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-text-2">
            {tenant.address && (
              <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {tenant.address}</span>
            )}
            {tenant.phone && (
              <span className="inline-flex items-center gap-1.5"><Phone size={14} /> {tenant.phone}</span>
            )}
            <span className="inline-flex items-center gap-1.5 text-accent">
              <Star size={14} fill="currentColor" /> 4.9 (180 reseñas)
            </span>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 text-xs text-text-muted">
            Depósito de reserva:
            <span className="font-mono text-accent-2">{tenant.deposit_pct}%</span>
            del servicio para asegurar tu lugar.
          </div>
        </motion.div>
      </div>
    </section>
  );
}

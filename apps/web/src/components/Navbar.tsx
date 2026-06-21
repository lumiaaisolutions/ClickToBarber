"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/#features", label: "Funciones" },
  { href: "/#presets",  label: "Identidad" },
  { href: "/#pricing",  label: "Planes" },
  { href: "/b/el-navajazo", label: "Demo cliente" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  // Bloquea scroll cuando el menú móvil está abierto.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.78, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
      className="fixed top-0 left-0 right-0 z-40"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between backdrop-blur-md bg-bg-canvas/72 border-b border-line-fine">
        <Link href="/" className="flex items-center gap-2 text-primary" onClick={() => setOpen(false)}>
          <Logo size={28} />
        </Link>

        <nav className="hidden md:flex items-center gap-8 lg:gap-10 text-sm tracking-noble text-ink-2">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="hover-spread">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="btn btn-ghost text-xs sm:text-sm py-1.5 sm:py-2 px-3 sm:px-5">
            Iniciar sesión
          </Link>
          <Link href="/precios" className="btn btn-primary text-xs sm:text-sm py-1.5 sm:py-2 px-3 sm:px-5 hidden sm:inline-flex">
            Cotizar plan
          </Link>
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-[10px] border border-line-medium text-ink-2 hover:text-primary hover:border-primary/40 transition"
          >
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden border-b border-line-fine bg-bg-canvas/95 backdrop-blur-md"
          >
            <nav className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-3 rounded-[10px] text-sm text-ink-2 hover:text-primary hover:bg-bg-paper/60 tracking-noble transition"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/precios"
                onClick={() => setOpen(false)}
                className="mt-2 px-3 py-3 rounded-[10px] text-sm text-primary border border-primary/30 bg-primary/5 tracking-noble text-center"
              >
                Cotizar plan
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

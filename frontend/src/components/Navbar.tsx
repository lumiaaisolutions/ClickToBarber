"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { motion } from "framer-motion";

export function Navbar() {
  return (
    <motion.header
      initial={{ y: -32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      className="fixed top-0 left-0 right-0 z-40"
    >
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between backdrop-blur-md bg-bg-void/40 border-b border-border-subtle">
        <Link href="/" className="flex items-center gap-3">
          <Logo size={36} />
          <span className="font-display text-xl tracking-wide">BarberPro</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-text-2">
          <Link href="/#features" className="hover:text-accent-2 transition">Funciones</Link>
          <Link href="/#pricing"  className="hover:text-accent-2 transition">Planes</Link>
          <Link href="/b/el-navajazo" className="hover:text-accent-2 transition">Demo Cliente</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/admin" className="btn-ghost px-4 py-2 rounded-full text-sm">
            Portal Admin
          </Link>
          <Link href="/b/el-navajazo" className="btn-gold px-4 py-2 rounded-full text-sm font-medium hidden sm:inline-flex">
            Reservar
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

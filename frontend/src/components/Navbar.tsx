"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { motion } from "framer-motion";

export function Navbar() {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.78, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
      className="fixed top-0 left-0 right-0 z-40"
    >
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between backdrop-blur-md bg-bg-canvas/72 border-b border-line-fine">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <Logo size={28} />
        </Link>

        <nav className="hidden md:flex items-center gap-10 text-sm tracking-noble text-ink-2">
          <Link href="/#features" className="hover-spread">Funciones</Link>
          <Link href="/#presets" className="hover-spread">Identidad</Link>
          <Link href="/#pricing"  className="hover-spread">Planes</Link>
          <Link href="/b/el-navajazo" className="hover-spread">Demo cliente</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="btn btn-ghost text-sm py-2 px-5">
            Iniciar sesión
          </Link>
          <Link href="/precios" className="btn btn-primary text-sm py-2 px-5 hidden sm:inline-flex">
            Cotizar plan
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

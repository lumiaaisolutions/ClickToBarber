import Link from "next/link";
import { Logo } from "@/components/Logo";

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative pt-16 sm:pt-24 pb-10 sm:pb-12 px-4 sm:px-6 border-t border-line-medium mt-16 sm:mt-24 bg-bg-paper/60">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-12 sm:mb-16">
          <div className="md:col-span-2">
            <Link href="/" className="text-primary inline-block">
              <Logo size={36} />
            </Link>
            <p className="font-display italic text-ink-2 text-lg mt-6 max-w-md leading-relaxed">
              Software de barbería con identidad propia. Cada negocio merece una
              herramienta que se sienta suya — desde el primer trazo.
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm tracking-imperial text-ink-2 mb-4">Producto</h4>
            <ul className="space-y-3 text-sm text-ink">
              <li><Link href="/#features" className="hover-spread inline-block">Funciones</Link></li>
              <li><Link href="/#presets" className="hover-spread inline-block">Presets de identidad</Link></li>
              <li><Link href="/precios" className="hover-spread inline-block">Planes</Link></li>
              <li><Link href="/b/el-navajazo" className="hover-spread inline-block">Demo cliente</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm tracking-imperial text-ink-2 mb-4">Cuenta</h4>
            <ul className="space-y-3 text-sm text-ink">
              <li><Link href="/login" className="hover-spread inline-block">Iniciar sesión</Link></li>
              <li><Link href="/precios" className="hover-spread inline-block">Cotizar</Link></li>
              <li>
                <a href="https://lumiaaisolutions.com" target="_blank" rel="noopener noreferrer" className="hover-spread inline-block">
                  LUMIA AI Solutions
                </a>
              </li>
            </ul>
          </div>
        </div>

        <hr className="hairline" />

        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-ink-muted">
          <div>© {year} LUMIA. Hecho con tijera fina y mucho oficio.</div>
          <div>
            <span className="font-mono">v0.2.0 · multi-tenant · old money edition</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

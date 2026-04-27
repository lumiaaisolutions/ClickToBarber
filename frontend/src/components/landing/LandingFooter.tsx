import { Logo } from "@/components/Logo";

export function LandingFooter() {
  return (
    <footer className="relative py-16 px-6 border-t border-border-subtle mt-16">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <span className="font-display text-lg">BarberPro</span>
          <span className="text-text-muted text-xs ml-3">© {new Date().getFullYear()}</span>
        </div>
        <div className="text-xs text-text-muted">
          Hecho con navaja en CDMX. <span className="text-accent-2">Multi-tenant ready.</span>
        </div>
        <div className="text-xs text-text-muted font-mono">
          API: <span className="text-accent">localhost:8000</span> · UI: localhost:3000
        </div>
      </div>
    </footer>
  );
}

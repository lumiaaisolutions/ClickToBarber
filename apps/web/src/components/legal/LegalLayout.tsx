import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LandingFooter } from "@/components/landing/LandingFooter";

interface Props {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalLayout({ eyebrow, title, lastUpdated, children }: Props) {
  return (
    <>
      <header className="px-4 sm:px-6 pt-6 sm:pt-10">
        <Link href="/" className="inline-flex items-center gap-2 text-primary">
          <Logo size={26} />
        </Link>
      </header>

      <main className="px-4 sm:px-6 py-12 sm:py-20">
        <article className="max-w-3xl mx-auto">
          <div className="text-[10px] tracking-imperial text-accent-3 mb-4">{eyebrow}</div>
          <h1 className="font-display italic text-[clamp(2rem,5vw,4rem)] leading-[1.05] text-ink mb-3">
            {title}
          </h1>
          <p className="text-xs text-ink-muted mb-10">Última actualización: {lastUpdated}</p>
          <div className="prose prose-sm max-w-none text-ink-2 leading-relaxed space-y-4 [&_h2]:font-display [&_h2]:italic [&_h2]:text-2xl [&_h2]:text-ink [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink [&_h3]:mt-6 [&_h3]:mb-2 [&_a]:text-primary [&_a:hover]:underline [&_strong]:text-ink [&_li]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
            {children}
          </div>

          <div className="mt-16 p-5 rounded-2xl bg-bg-vellum border border-line-medium text-xs text-ink-muted leading-relaxed">
            Este documento es una <strong>plantilla</strong>. Antes de operar en
            producción, debe ser revisado por un abogado en cada jurisdicción donde
            opere LUMIA o sus tenants. Texto sujeto a cambio.
          </div>
        </article>
      </main>

      <LandingFooter />
    </>
  );
}

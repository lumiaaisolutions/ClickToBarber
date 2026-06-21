"use client";

import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * FeatureGate: si la feature no está habilitada en el plan del tenant,
 * blurrea el children y monta un overlay con candado dorado y CTA upgrade.
 * La validación real ocurre en el backend (middleware EnsureFeatureEnabled).
 */
export function FeatureGate({
  feature,
  enabled,
  children,
  requiredPlan,
  className,
  upgradeHref = "/admin/billing",
}: {
  feature: string;
  enabled: boolean;
  children: ReactNode;
  requiredPlan?: string | null;
  className?: string;
  upgradeHref?: string;
}) {
  if (enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative isolate overflow-hidden rounded-[18px]", className)}>
      <div
        aria-hidden
        className="pointer-events-none select-none"
        style={{
          filter: "blur(5px) grayscale(0.55) brightness(1.05)",
          opacity: 0.6,
          transform: "scale(1.01)",
        }}
      >
        {children}
      </div>

      <div className="absolute inset-0 lock-overlay flex flex-col items-center justify-center text-center p-10">
        <div className="rounded-full p-3.5 mb-5 border border-line-strong bg-bg-paper/90 shadow-[0_12px_32px_-16px_rgba(31,61,43,0.28)]">
          <Lock className="text-accent-3" size={24} strokeWidth={1.6} />
        </div>
        <div className="font-display italic text-2xl text-ink mb-1">Función premium</div>
        <div className="text-sm text-ink-2 max-w-xs leading-relaxed">
          <code className="text-primary font-mono text-xs px-1.5 py-0.5 rounded bg-bg-paper/80 border border-line-fine">
            {feature}
          </code>{" "}
          requiere {requiredPlan ? <strong className="text-primary">{requiredPlan}</strong> : "un plan superior"}.
        </div>
        <Link
          href={upgradeHref}
          className="mt-6 btn btn-primary inline-flex items-center gap-2"
        >
          <Sparkles size={15} />
          Mejorar plan
        </Link>
      </div>
    </div>
  );
}

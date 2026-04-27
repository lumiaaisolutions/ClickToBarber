"use client";

import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * FeatureGate: renderiza el children y, si no está habilitada la feature en el plan
 * actual del tenant, lo bloquea visualmente con un overlay con candado dorado y
 * CTA de upgrade. La validación real ocurre en el backend (middleware EnsureFeatureEnabled).
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
          filter: "blur(5px) grayscale(0.65) brightness(0.6)",
          opacity: 0.55,
          transform: "scale(1.01)",
        }}
      >
        {children}
      </div>

      <div className="absolute inset-0 lock-overlay flex flex-col items-center justify-center text-center p-8">
        <div className="rounded-full p-3 mb-4 border border-border-strong bg-bg-base/70 backdrop-blur-sm">
          <Lock className="text-accent" size={26} strokeWidth={1.6} />
        </div>
        <div className="font-display text-xl text-text mb-1">Función premium</div>
        <div className="text-sm text-text-2 max-w-xs mb-1">
          <code className="text-accent font-mono text-xs px-1.5 py-0.5 rounded bg-bg-elevated/60">
            {feature}
          </code>{" "}
          requiere {requiredPlan ? <strong className="text-accent-2">{requiredPlan}</strong> : "un plan superior"}.
        </div>
        <Link
          href={upgradeHref}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full btn-gold text-sm font-medium"
        >
          <Sparkles size={16} />
          Mejorar plan
        </Link>
      </div>
    </div>
  );
}

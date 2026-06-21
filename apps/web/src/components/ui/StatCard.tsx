import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card-paper p-6 flex flex-col gap-2 relative overflow-hidden",
        accent && "border-primary/30 shadow-[0_24px_48px_-32px_rgba(31,61,43,0.32)]",
        className,
      )}
    >
      {accent && (
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/8 blur-3xl pointer-events-none" aria-hidden />
      )}
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-imperial text-ink-muted">{label}</span>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <div className="font-display italic text-4xl text-ink tabular-nums leading-none mt-1">{value}</div>
      {hint && <div className="text-xs text-ink-2 mt-1">{hint}</div>}
    </div>
  );
}

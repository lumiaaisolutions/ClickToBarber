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
    <div className={cn("card-premium p-5 flex flex-col gap-2 relative overflow-hidden", className)}>
      {accent && (
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-accent/10 blur-2xl" aria-hidden />
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-text-muted">{label}</span>
        {icon && <span className="text-accent">{icon}</span>}
      </div>
      <div className="font-display text-3xl text-text font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-text-2">{hint}</div>}
    </div>
  );
}

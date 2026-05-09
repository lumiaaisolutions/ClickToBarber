import { cn } from "@/lib/utils";

/**
 * Skeleton loader genérico — usar como `<Skeleton className="h-4 w-32" />`.
 * Anima un shimmer suave con CSS pure.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-bg-vellum",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.6s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent",
        className,
      )}
    />
  );
}

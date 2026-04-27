import { cn } from "@/lib/utils";
import { forwardRef, ButtonHTMLAttributes } from "react";

type Variant = "gold" | "ghost" | "bordeaux";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-full",
  md: "px-5 py-2.5 text-sm rounded-full",
  lg: "px-7 py-3.5 text-base rounded-full",
};

const variants: Record<Variant, string> = {
  gold:     "btn-gold font-medium",
  ghost:    "btn-ghost font-medium",
  bordeaux: "bg-bordeaux text-text border border-bordeaux hover:bg-[#8C2A38] transition",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "gold", size = "md", children, ...props },
  ref,
) {
  return (
    <button ref={ref} className={cn("inline-flex items-center justify-center gap-2", sizes[size], variants[variant], className)} {...props}>
      {children}
    </button>
  );
});

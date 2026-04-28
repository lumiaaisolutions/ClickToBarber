import { cn } from "@/lib/utils";
import { forwardRef, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "ghost" | "link" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const sizes: Record<Size, string> = {
  sm: "px-4 py-1.5 text-xs",
  md: "px-6 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-base",
};

const variants: Record<Variant, string> = {
  primary: "btn btn-primary",
  accent:  "btn btn-accent",
  ghost:   "btn btn-ghost",
  link:    "btn btn-link",
  danger:  "btn bg-danger text-white border border-danger hover:opacity-90",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", children, ...props },
  ref,
) {
  return (
    <button ref={ref} className={cn(variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
});

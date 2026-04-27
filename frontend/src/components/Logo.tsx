import { cn } from "@/lib/utils";

/** Logo BarberPro: navaja estilizada + monograma. SVG inline para animaciones. */
export function Logo({ className, size = 48 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block", className)}
      role="img"
      aria-label="BarberPro"
    >
      <defs>
        <linearGradient id="bp-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E0BE74" />
          <stop offset="55%" stopColor="#C9A961" />
          <stop offset="100%" stopColor="#8E7338" />
        </linearGradient>
        <linearGradient id="bp-blade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F4EFE3" />
          <stop offset="100%" stopColor="#A8A39A" />
        </linearGradient>
      </defs>

      {/* Anillo dorado exterior */}
      <circle cx="32" cy="32" r="29" fill="none" stroke="url(#bp-gold)" strokeWidth="2" />
      <circle cx="32" cy="32" r="29" fill="#0E1014" opacity="0.9" />

      {/* Navaja: hoja diagonal */}
      <path
        d="M16 44 L40 20 L46 22 L22 46 Z"
        fill="url(#bp-blade)"
        stroke="#C9A961"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Mango */}
      <rect x="40" y="18" width="10" height="6" rx="1.5" fill="#6B1F2A" stroke="#C9A961" strokeWidth="0.6" transform="rotate(-45 45 21)" />
      {/* Pivote */}
      <circle cx="40" cy="20" r="1.6" fill="#C9A961" />

      {/* Monograma "BP" sutil arriba */}
      <text
        x="32"
        y="14"
        textAnchor="middle"
        fontSize="6"
        fontFamily="serif"
        fontWeight="700"
        fill="#C9A961"
        opacity="0.9"
      >
        BP
      </text>
    </svg>
  );
}

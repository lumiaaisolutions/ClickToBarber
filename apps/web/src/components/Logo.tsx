import { cn } from "@/lib/utils";

/**
 * ClickToBarber — Logo identitario.
 *
 *  - `variant="wordmark"` (default): mark + "ClickToBarber" en Geist.
 *  - `variant="mark"`: solo el símbolo cuadrado redondeado.
 *
 * El mark es un cuadrado con gradient azul→cyan, una "C" estilizada como
 * silla de barbero invertida (curve top + base sólida) y una tijera
 * abierta a la derecha — distintivo, no genérico.
 *
 * El SVG es 100% inline, sin dependencias externas, sin colores
 * hardcoded en CSS (todo desde gradientes definidos en `<defs>`).
 */
export function Logo({
  className,
  size = 36,
  variant = "wordmark",
}: {
  className?: string;
  size?: number;
  variant?: "wordmark" | "mark";
}) {
  if (variant === "mark") {
    return <LogoMark className={className} size={size} />;
  }

  const markSize = size;
  const textSize = size * 0.6;

  return (
    <div
      className={cn("inline-flex items-center gap-2.5 leading-none", className)}
      role="img"
      aria-label="ClickToBarber"
    >
      <LogoMark size={markSize} />
      <span
        className="font-semibold tracking-tight whitespace-nowrap leading-none"
        style={{
          fontSize: textSize,
          letterSpacing: "-0.025em",
          color: "currentColor",
        }}
      >
        Click<span style={{ color: "var(--md-primary, #C4922A)" }}>To</span>Barber
      </span>
    </div>
  );
}

export function LogoMark({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  // ID único por mount para evitar colisiones de gradient cuando hay
  // múltiples instancias en la misma página.
  const uid = `ctb-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block shrink-0", className)}
      role="img"
      aria-label="ClickToBarber"
    >
      <defs>
        {/* Gradient oro → madera, idéntico al sistema --cb-gradient */}
        <linearGradient id={`${uid}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C4922A" />
          <stop offset="100%" stopColor="#8B5A2B" />
        </linearGradient>
        {/* Sombra interna sutil */}
        <linearGradient id={`${uid}-shine`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#8B5A2B" floodOpacity="0.30" />
        </filter>
      </defs>

      {/* Cuadrado redondeado con gradient */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="18"
        ry="18"
        fill={`url(#${uid}-bg)`}
        filter={`url(#${uid}-shadow)`}
      />

      {/* Shine top — gloss sutil */}
      <rect x="2" y="2" width="60" height="60" rx="18" ry="18" fill={`url(#${uid}-shine)`} />

      {/* ─── ÍCONO COMPUESTO: Silla de barbero estilizada + tijera ─── */}

      {/* Silla — base + respaldo curvo blanco translúcido grande */}
      <g stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
        {/* Respaldo (arc) */}
        <path d="M 18 38 Q 18 18, 32 18 Q 46 18, 46 38" />
        {/* Asiento horizontal */}
        <line x1="16" y1="38" x2="48" y2="38" />
        {/* Pata central */}
        <line x1="32" y1="38" x2="32" y2="48" />
        {/* Base inferior */}
        <path d="M 22 48 L 42 48" />
      </g>

      {/* Tijera abierta — esquina inferior derecha, accent dorado */}
      <g
        transform="translate(46 46) rotate(-20)"
        stroke="white"
        strokeWidth="1.8"
        fill="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Anillos */}
        <circle cx="-2.5" cy="0" r="2.2" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.6" />
        <circle cx="2.5" cy="0" r="2.2" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.6" />
        {/* Hojas cruzadas */}
        <line x1="-1.2" y1="1.4" x2="6" y2="8" stroke="white" strokeWidth="1.8" fill="none" />
        <line x1="1.2" y1="1.4" x2="-6" y2="8" stroke="white" strokeWidth="1.8" fill="none" />
        {/* Pivote */}
        <circle cx="0" cy="3" r="0.7" fill="white" stroke="none" />
      </g>
    </svg>
  );
}

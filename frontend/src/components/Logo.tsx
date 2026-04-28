import { cn } from "@/lib/utils";

/**
 * LUMIA — wordmark con tijera como punto de la "i".
 * El SVG hereda color de currentColor: úsalo con className="text-primary".
 * El grupo `.scissor` se anima en hover (apertura sutil de hojas).
 */
export function Logo({
  className,
  size = 140,
  variant = "wordmark",
}: {
  className?: string;
  size?: number;
  variant?: "wordmark" | "mark";
}) {
  if (variant === "mark") {
    return <LogoMark className={className} size={size} />;
  }

  const height = size;
  const width = (size * 220) / 64; // 220:64 ≈ 3.44

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 220 64"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block lumia-logo", className)}
      role="img"
      aria-label="LUMIA"
      style={{ overflow: "visible" }}
    >
      <text
        x="0"
        y="50"
        fontFamily="var(--font-cormorant), 'Cormorant Garamond', Garamond, Georgia, serif"
        fontSize="56"
        fontWeight="500"
        fontStyle="italic"
        fill="currentColor"
        letterSpacing="0.02em"
      >
        lum
        {/* trazo vertical de la "i" sin punto: usamos tspan invisible para reservar ancho */}
        <tspan dx="0" style={{ letterSpacing: "0.02em" }}>ı</tspan>
        a
      </text>

      {/* Tijera diminuta como punto de la "i" */}
      <g
        className="scissor"
        transform="translate(102 12) rotate(-12)"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Mangos (anillos) */}
        <circle cx="-3.2" cy="0" r="2.4" />
        <circle cx="3.2"  cy="0" r="2.4" />
        {/* Hojas cruzadas */}
        <path d="M -1.4 1.6 L 6.5 9.2" />
        <path d="M 1.4 1.6 L -6.5 9.2" />
        {/* Pivote */}
        <circle cx="0" cy="3.4" r="0.6" fill="currentColor" stroke="none" />
      </g>

      <style>{`
        .lumia-logo .scissor {
          transform-origin: 102px 16px;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .lumia-logo:hover .scissor {
          transform: translate(102px, 12px) rotate(2deg);
        }
      `}</style>
    </svg>
  );
}

/** Marca compacta — solo la tijera. Para favicons, sidebar colapsado, app icons. */
export function LogoMark({
  className,
  size = 48,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block", className)}
      role="img"
      aria-label="LUMIA"
    >
      {/* Anillo decorativo */}
      <circle
        cx="32"
        cy="32"
        r="29"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.4"
      />

      <g
        transform="translate(32 22)"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Mangos */}
        <circle cx="-7" cy="0" r="5.5" />
        <circle cx="7"  cy="0" r="5.5" />
        {/* Hojas cruzadas */}
        <path d="M -3.4 3.6 L 14 22" />
        <path d="M 3.4 3.6 L -14 22" />
        {/* Pivote */}
        <circle cx="0" cy="7" r="1.4" fill="currentColor" stroke="none" />
      </g>

      {/* Detalle: monograma "L" sutil debajo */}
      <text
        x="32"
        y="58"
        textAnchor="middle"
        fontFamily="var(--font-cormorant), 'Cormorant Garamond', Garamond, serif"
        fontSize="8"
        fontStyle="italic"
        fontWeight="600"
        fill="currentColor"
        opacity="0.85"
        letterSpacing="0.4em"
      >
        LUMIA
      </text>
    </svg>
  );
}

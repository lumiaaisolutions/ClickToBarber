import type { NextConfig } from "next";

/**
 * Bundle analyzer opcional: `ANALYZE=1 npm run build` genera reportes
 * estáticos en `.next/analyze/`. En CI corre con `ANALYZE=1` para que
 * `scripts/check-bundle-budget.mjs` lea el manifest y falle si el chunk
 * inicial del admin sobrepasa el threshold.
 */
const withAnalyzerMaybe = (config: NextConfig): NextConfig => {
  if (process.env.ANALYZE !== "1") return config;
  try {
    // Carga perezosa para no obligar a tener el paquete en runtime.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const withBundleAnalyzer = require("@next/bundle-analyzer")({
      enabled: true,
      openAnalyzer: false,
    });
    return withBundleAnalyzer(config);
  } catch {
    console.warn("[next.config] @next/bundle-analyzer no instalado; ignorando ANALYZE=1");
    return config;
  }
};

const nextConfig: NextConfig = {
  // Genera bundle minimal para Docker (sólo lo que usa server.js)
  output: "standalone",

  // Permite acceder al dev server desde 127.0.0.1 (no solo localhost) sin bloquear HMR
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  // Imágenes externas que usamos en el demo (avatars + cover)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  // Silencia warning de workspace root inferido (lockfile en backend/)
  turbopack: {
    root: __dirname,
  },
};

export default withAnalyzerMaybe(nextConfig);

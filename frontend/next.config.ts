import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

export default nextConfig;

import type { MetadataRoute } from "next";

/**
 * PWA manifest. Por ahora la app es genérica LUMIA — para hacer un manifest
 * por tenant en custom domain habría que servir un manifest distinto desde
 * un route handler que detecte el host. Esta primera iteración da el shell
 * común con identidad LUMIA.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LUMIA — Software de barbería",
    short_name: "LUMIA",
    description: "Reserva, agenda y experiencia premium para barberías.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF7EE",
    theme_color: "#1F3D2B",
    lang: "es-MX",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    categories: ["business", "productivity", "lifestyle"],
  };
}

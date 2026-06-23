import type { Metadata, Viewport } from "next";
import { Raleway, Playfair_Display } from "next/font/google";
import "./globals.css";
import "sileo/styles.css";
import { Toaster } from "sileo";
import { Preloader } from "@/components/Preloader";
import { LenisProvider } from "@/components/LenisProvider";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { Analytics } from "@/components/Analytics";

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClickToBarber — Tu barbería en un solo lugar",
  description:
    "Agenda, clientes y reservas por WhatsApp. Todo en un sitio diseñado para tu barbería.",
  applicationName: "ClickToBarber",
  authors: [{ name: "ClickToBarber" }],
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  initialScale: 1,
  width: "device-width",
};

/**
 * Pre-flight script — corre ANTES del render de React. Lee preferencia
 * del usuario (localStorage `ctb:mode`) o del SO y setea `data-mode` en
 * <html> antes del paint. Sin esto, el usuario que prefiere oscuro vería
 * un flash blanco mientras hidrata.
 */
const DARK_MODE_PREFLIGHT = `(function(){try{var m=localStorage.getItem('ctb:mode');if(!m){m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-mode',m);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${raleway.variable} ${playfair.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: DARK_MODE_PREFLIGHT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Preloader />
        <LenisProvider>{children}</LenisProvider>
        <Toaster
          position="top-right"
          theme="dark"
          offset={{ top: 24, right: 24 }}
          options={{ duration: 4200, roundness: 24 }}
        />
        <CookieConsentBanner />
        <Analytics />
      </body>
    </html>
  );
}

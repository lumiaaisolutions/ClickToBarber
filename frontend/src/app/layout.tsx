import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Preloader } from "@/components/Preloader";
import { LenisProvider } from "@/components/LenisProvider";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LUMIA — Software de barbería con identidad propia.",
  description:
    "Plataforma SaaS multi-tenant para barberías de autor: agenda inteligente, anti no-show vía WhatsApp, marketing de retención, POS y finanzas. Cada barbería con su propia identidad visual.",
  applicationName: "LUMIA",
  authors: [{ name: "LUMIA AI Solutions", url: "https://lumiaaisolutions.com" }],
};

export const viewport: Viewport = {
  themeColor: "#FBF7EE",
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${cormorant.variable} ${interTight.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col texture-paper">
        <Preloader />
        <LenisProvider>
          {children}
        </LenisProvider>
      </body>
    </html>
  );
}

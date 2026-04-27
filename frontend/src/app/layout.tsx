import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Preloader } from "@/components/Preloader";
import { LenisProvider } from "@/components/LenisProvider";
import { Background3D } from "@/components/Background3D";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
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
  title: "BarberPro — La barbería ya tiene navaja. Ahora tiene sistema.",
  description:
    "Plataforma SaaS multi-tenant para barberías premium: agenda, anti no-show con WhatsApp, marketing de retención, POS y finanzas.",
  applicationName: "BarberPro",
};

export const viewport: Viewport = {
  themeColor: "#07080A",
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col texture-grain">
        <Preloader />
        <Background3D />
        <LenisProvider>
          {children}
        </LenisProvider>
      </body>
    </html>
  );
}

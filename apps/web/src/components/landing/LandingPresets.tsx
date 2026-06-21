"use client";

import { motion } from "framer-motion";

interface Preset {
  code: string;
  name: string;
  description: string;
  primary: string;
  accent: string;
  canvas: string;
  paper: string;
  ink: string;
  font: string;
}

const PRESETS: Preset[] = [
  {
    code: "old-money-emerald",
    name: "Old Money Verde",
    description: "Verde botella, marfil, oro mate. Para clubs privados y barberías clásicas.",
    primary: "#1F3D2B",
    accent: "#B8935E",
    canvas: "#FBF7EE",
    paper: "#F5EFE0",
    ink: "#1A1F1B",
    font: "Cormorant Garamond",
  },
  {
    code: "ivory-brass",
    name: "Marfil & Latón",
    description: "Crema cálida, latón pulido. Para shops de autor con luz natural.",
    primary: "#4A3320",
    accent: "#A37438",
    canvas: "#F4EAD2",
    paper: "#ECE0BF",
    ink: "#2A2014",
    font: "Cormorant Garamond",
  },
  {
    code: "navy-classic",
    name: "Navy Clásico",
    description: "Azul medianoche, hueso, plata vieja. Para barberías frente al mar.",
    primary: "#1A2F4F",
    accent: "#8C9DB5",
    canvas: "#F2F0EA",
    paper: "#E8E4D8",
    ink: "#0E1A2D",
    font: "Cormorant Garamond",
  },
  {
    code: "carbon-premium",
    name: "Carbón Premium",
    description: "Carbón, latón, sangre. Para barberías nocturnas y atelier urbano.",
    primary: "#2D5240",
    accent: "#C9A961",
    canvas: "#0E1014",
    paper: "#161A21",
    ink: "#F4EFE3",
    font: "Cormorant Garamond",
  },
];

export function LandingPresets() {
  return (
    <section id="presets" className="relative py-20 sm:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12 sm:mb-20"
        >
          <div className="text-[10px] tracking-imperial text-accent-3 mb-3 sm:mb-4">Identidad</div>
          <h2 className="font-display italic text-[clamp(2rem,5.5vw,5rem)] leading-[1.05] sm:leading-[1.02] text-ink">
            Cuatro presets.
            <br />
            <span className="text-emerald-grad">Infinitas barberías.</span>
          </h2>
          <p className="mt-5 sm:mt-6 text-sm sm:text-base text-ink-2 max-w-2xl mx-auto leading-relaxed">
            Empieza con un preset cuidado por nosotros y ajústalo a tu marca: colores,
            tipografías, radios, densidad y logo. Tu identidad vive en <span className="font-display italic">/admin</span> y
            en el link que compartes con tus clientes.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {PRESETS.map((p, i) => (
            <motion.article
              key={p.code}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
              className="group rounded-[18px] overflow-hidden border border-line-medium hover:border-line-strong transition-all duration-500"
              style={{ background: p.canvas }}
            >
              {/* Mini-mock con la paleta */}
              <div className="p-5 sm:p-6 lg:p-8 pb-5 sm:pb-6 relative" style={{ color: p.ink }}>
                <div className="flex items-center justify-between mb-4 sm:mb-5">
                  <div
                    className="text-[10px] tracking-imperial"
                    style={{ color: p.primary }}
                  >
                    Preset {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex gap-1.5">
                    <Swatch color={p.primary} />
                    <Swatch color={p.accent} />
                    <Swatch color={p.paper} border />
                  </div>
                </div>

                <h3
                  className="font-display italic text-2xl sm:text-3xl mb-2 sm:mb-3"
                  style={{ color: p.ink, fontFamily: p.font }}
                >
                  {p.name}
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: p.ink, opacity: 0.74 }}>
                  {p.description}
                </p>

                {/* Mock botones */}
                <div className="mt-5 sm:mt-7 flex flex-wrap gap-2 sm:gap-3">
                  <span
                    className="inline-flex items-center px-4 py-2 text-xs tracking-noble"
                    style={{
                      background: p.primary,
                      color: p.canvas,
                      borderRadius: 10,
                      fontFamily: p.font,
                    }}
                  >
                    Reservar
                  </span>
                  <span
                    className="inline-flex items-center px-4 py-2 text-xs tracking-noble border"
                    style={{
                      borderColor: p.ink,
                      color: p.ink,
                      borderRadius: 10,
                      fontFamily: p.font,
                      opacity: 0.7,
                    }}
                  >
                    Ver agenda
                  </span>
                </div>
              </div>

              {/* Banda inferior con tipografía */}
              <div
                className="px-5 sm:px-6 lg:px-8 py-4 sm:py-5 border-t flex items-center justify-between gap-3"
                style={{ borderColor: `${p.ink}1c`, background: p.paper }}
              >
                <span
                  className="font-display italic text-xl"
                  style={{ color: p.primary, fontFamily: p.font }}
                >
                  lumia
                </span>
                <span
                  className="text-[9px] sm:text-[10px] tracking-imperial truncate"
                  style={{ color: p.ink, opacity: 0.6 }}
                >
                  {p.font.split(" ")[0]} · Inter Tight
                </span>
              </div>
            </motion.article>
          ))}
        </div>

        <p className="text-center text-xs text-ink-muted mt-12 italic max-w-xl mx-auto">
          Todos los presets son editables desde el wizard de identidad la primera vez que entras a tu portal.
        </p>
      </div>
    </section>
  );
}

function Swatch({ color, border }: { color: string; border?: boolean }) {
  return (
    <span
      className="w-3.5 h-3.5 rounded-full"
      style={{
        background: color,
        boxShadow: border ? "inset 0 0 0 1px rgba(0,0,0,0.18)" : "none",
      }}
    />
  );
}

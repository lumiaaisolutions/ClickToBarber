"use client";

import { motion } from "framer-motion";
import { useCallback } from "react";
import { ScrollSequence } from "@/components/scroll/ScrollSequence";

/**
 * Demo de image-sequence scrubbing pero en modo procedural — el canvas
 * se redibuja en cada scroll tick. Misma técnica que usaría con frames
 * reales, sin necesitar assets externos.
 *
 * Si tienes una secuencia real (ej. /sequences/booking/frame_001.webp …),
 * cambia a:
 *   const frames = Array.from({length: 60}, (_, i) =>
 *     `/sequences/booking/frame_${String(i+1).padStart(3, "0")}.webp`);
 *   <ScrollSequence frames={frames} aspectRatio={9/16} height="320vh" />
 */
export function LandingScrollFlow() {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, p: number, w: number, h: number) => {
      // Fondo del canvas: gradient azul→cyan suave (no compite con el fondo del site)
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "rgba(243, 245, 251, 0)");
      bg.addColorStop(1, "rgba(233, 237, 248, 0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Phone — centrado, con tilt sutil basado en progress
      const phoneW = Math.min(w * 0.46, 320);
      const phoneH = phoneW * 2;
      const cx = w / 2;
      const cy = h / 2;
      const tilt = (p - 0.5) * 0.06; // -3° a +3°

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.translate(-phoneW / 2, -phoneH / 2);

      // Sombra del phone
      ctx.shadowColor = "rgba(15, 23, 42, 0.18)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 24;

      // Cuerpo del phone (rounded rect)
      drawRoundedRect(ctx, 0, 0, phoneW, phoneH, 32);
      const phoneGrad = ctx.createLinearGradient(0, 0, 0, phoneH);
      phoneGrad.addColorStop(0, "#1E293B");
      phoneGrad.addColorStop(1, "#0F172A");
      ctx.fillStyle = phoneGrad;
      ctx.fill();

      ctx.shadowColor = "transparent";

      // Pantalla
      const sx = 10, sy = 10;
      const sw = phoneW - 20;
      const sh = phoneH - 20;
      drawRoundedRect(ctx, sx, sy, sw, sh, 24);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();

      // Status bar
      ctx.fillStyle = "#0F172A";
      ctx.font = `600 ${Math.round(sw * 0.04)}px "Sora", system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText("9:41", sx + sw * 0.08, sy + sw * 0.08);
      // Notch
      ctx.fillStyle = "#0F172A";
      drawRoundedRect(ctx, sx + sw * 0.32, sy + 4, sw * 0.36, sw * 0.06, 12);
      ctx.fill();

      // Render 4 estados con cross-fade
      const screenX = sx + sw * 0.06;
      const screenY = sy + sw * 0.18;
      const screenW = sw - sw * 0.12;
      const screenH = sh - sw * 0.30;

      // Cada estado ocupa una ventana de progress con bordes blendeables
      const stages = [
        { range: [0.00, 0.30] as const, draw: drawCalendar },
        { range: [0.20, 0.55] as const, draw: drawTimeSlots },
        { range: [0.45, 0.78] as const, draw: drawConfirm },
        { range: [0.70, 1.00] as const, draw: drawWhatsApp },
      ];

      for (const stage of stages) {
        const a = alphaFor(p, stage.range[0], stage.range[1]);
        if (a > 0.01) {
          ctx.save();
          ctx.globalAlpha = a;
          stage.draw(ctx, screenX, screenY, screenW, screenH);
          ctx.restore();
        }
      }

      ctx.restore();
    },
    [],
  );

  return (
    <section className="relative bg-bg-vellum/40">
      <ScrollSequence
        draw={draw}
        aspectRatio={4 / 3}
        height="320vh"
        maxWidth={820}
      >
        <motion.div
          className="absolute top-12 left-0 right-0 text-center px-4 z-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-display text-[clamp(2rem,5vw,4rem)] leading-[1.02] tracking-tight text-ink font-bold">
            Reserva en
            <br />
            <span className="text-cb-grad">tres toques.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-2 max-w-md mx-auto">
            Desplázate para verlo.
          </p>
        </motion.div>
      </ScrollSequence>
    </section>
  );
}

// ─── helpers de dibujo ─────────────────────────────────────────────

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Devuelve alpha 0..1 con cross-fade alrededor del rango [start, end].
 */
function alphaFor(p: number, start: number, end: number): number {
  const fadeIn = 0.05;
  const fadeOut = 0.05;
  if (p < start - fadeIn || p > end + fadeOut) return 0;
  if (p < start) return (p - (start - fadeIn)) / fadeIn;
  if (p > end) return 1 - (p - end) / fadeOut;
  return 1;
}

function drawCalendar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Eyebrow
  ctx.fillStyle = "#94A3B8";
  ctx.font = `600 ${Math.round(w * 0.045)}px "Sora", system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("ELIGE FECHA", x, y);

  // Mes
  ctx.fillStyle = "#0F172A";
  ctx.font = `700 ${Math.round(w * 0.08)}px "Bricolage Grotesque", system-ui, sans-serif`;
  ctx.fillText("Junio", x, y + w * 0.13);

  // Grid de días — 5 columnas
  const cols = 5;
  const cellSize = w / cols;
  const gridY = y + w * 0.2;
  const days = ["L", "M", "X", "J", "V"];
  for (let i = 0; i < cols; i++) {
    ctx.fillStyle = "#94A3B8";
    ctx.font = `600 ${Math.round(w * 0.04)}px "Sora", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(days[i], x + cellSize * (i + 0.5), gridY);
  }

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < cols; col++) {
      const day = row * cols + col + 8;
      const cx = x + cellSize * (col + 0.5);
      const cy = gridY + cellSize * 0.4 + row * cellSize * 0.85;
      const isActive = day === 15;
      if (isActive) {
        ctx.beginPath();
        const grad = ctx.createLinearGradient(cx - cellSize * 0.35, cy - cellSize * 0.35, cx + cellSize * 0.35, cy + cellSize * 0.35);
        grad.addColorStop(0, "#3B82F6");
        grad.addColorStop(1, "#06B6D4");
        ctx.fillStyle = grad;
        ctx.arc(cx, cy, cellSize * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
      } else {
        ctx.fillStyle = "#0F172A";
      }
      ctx.font = `600 ${Math.round(w * 0.052)}px "Sora", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(day), cx, cy);
    }
  }
  ctx.textBaseline = "alphabetic";
}

function drawTimeSlots(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#94A3B8";
  ctx.font = `600 ${Math.round(w * 0.045)}px "Sora", system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("ELIGE HORA", x, y);

  ctx.fillStyle = "#0F172A";
  ctx.font = `700 ${Math.round(w * 0.08)}px "Bricolage Grotesque", system-ui, sans-serif`;
  ctx.fillText("Mar 15 jun", x, y + w * 0.13);

  const slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00"];
  const cols = 3;
  const gap = w * 0.04;
  const cellW = (w - gap * (cols - 1)) / cols;
  const cellH = w * 0.16;
  const startY = y + w * 0.22;
  const selected = 4;

  slots.forEach((slot, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const cx = x + col * (cellW + gap);
    const cy = startY + row * (cellH + gap * 0.7);
    if (i === selected) {
      const grad = ctx.createLinearGradient(cx, cy, cx + cellW, cy + cellH);
      grad.addColorStop(0, "#3B82F6");
      grad.addColorStop(1, "#06B6D4");
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = "#F3F5FB";
    }
    drawRoundedRect(ctx, cx, cy, cellW, cellH, 14);
    ctx.fill();
    ctx.fillStyle = i === selected ? "#FFFFFF" : "#0F172A";
    ctx.font = `600 ${Math.round(w * 0.05)}px "Sora", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(slot, cx + cellW / 2, cy + cellH / 2);
  });
  ctx.textBaseline = "alphabetic";
}

function drawConfirm(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#94A3B8";
  ctx.font = `600 ${Math.round(w * 0.045)}px "Sora", system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("CONFIRMA TU CITA", x, y);

  ctx.fillStyle = "#0F172A";
  ctx.font = `700 ${Math.round(w * 0.075)}px "Bricolage Grotesque", system-ui, sans-serif`;
  ctx.fillText("Corte + Barba", x, y + w * 0.12);

  // Detalles
  const details = [
    { label: "Barbero", value: "Diego" },
    { label: "Cuándo",  value: "Mar 15 jun · 11:00" },
    { label: "Costo",   value: "$380 MXN" },
  ];
  details.forEach((d, i) => {
    const ry = y + w * 0.22 + i * w * 0.13;
    drawRoundedRect(ctx, x, ry, w, w * 0.1, 14);
    ctx.fillStyle = "#F3F5FB";
    ctx.fill();
    ctx.fillStyle = "#475569";
    ctx.font = `500 ${Math.round(w * 0.04)}px "Sora", system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(d.label, x + w * 0.04, ry + w * 0.04);
    ctx.fillStyle = "#0F172A";
    ctx.font = `700 ${Math.round(w * 0.045)}px "Sora", system-ui, sans-serif`;
    ctx.fillText(d.value, x + w * 0.04, ry + w * 0.08);
  });

  // CTA
  const btnY = y + w * 0.68;
  drawRoundedRect(ctx, x, btnY, w, w * 0.13, 20);
  const grad = ctx.createLinearGradient(x, btnY, x + w, btnY + w * 0.13);
  grad.addColorStop(0, "#3B82F6");
  grad.addColorStop(1, "#06B6D4");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 ${Math.round(w * 0.05)}px "Sora", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Confirmar reserva", x + w / 2, btnY + w * 0.065);
  ctx.textBaseline = "alphabetic";
}

function drawWhatsApp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Bubble verde WhatsApp arriba
  const bubW = w * 0.86;
  const bubH = w * 0.5;
  const bx = x + (w - bubW) / 2;
  const by = y;

  drawRoundedRect(ctx, bx, by, bubW, bubH, 18);
  ctx.fillStyle = "#DCF8C6";
  ctx.fill();

  ctx.fillStyle = "#0F172A";
  ctx.font = `600 ${Math.round(w * 0.045)}px "Sora", system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("Tu cita está confirmada", bx + w * 0.04, by + w * 0.09);
  ctx.font = `400 ${Math.round(w * 0.038)}px "Sora", system-ui, sans-serif`;
  ctx.fillStyle = "#475569";
  ctx.fillText("Mar 15 jun · 11:00", bx + w * 0.04, by + w * 0.16);
  ctx.fillText("Diego en Barbería", bx + w * 0.04, by + w * 0.22);
  ctx.fillText("El Navajazo", bx + w * 0.04, by + w * 0.28);
  ctx.fillText("Te esperamos.", bx + w * 0.04, by + w * 0.40);

  // Checkmarks azules WhatsApp
  ctx.strokeStyle = "#06B6D4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx + bubW - w * 0.10, by + bubH - w * 0.04);
  ctx.lineTo(bx + bubW - w * 0.08, by + bubH - w * 0.02);
  ctx.lineTo(bx + bubW - w * 0.04, by + bubH - w * 0.07);
  ctx.stroke();

  // Sello: "Confirmado"
  const sealY = y + w * 0.66;
  drawRoundedRect(ctx, x + w * 0.18, sealY, w * 0.64, w * 0.16, 24);
  const grad = ctx.createLinearGradient(x, sealY, x + w, sealY + w * 0.16);
  grad.addColorStop(0, "#3B82F6");
  grad.addColorStop(1, "#06B6D4");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 ${Math.round(w * 0.055)}px "Sora", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("¡Listo!", x + w / 2, sealY + w * 0.08);
  ctx.textBaseline = "alphabetic";
}

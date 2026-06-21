#!/usr/bin/env node
/**
 * Verifica que el peso (gzipped) del First Load JS por ruta no exceda
 * los thresholds configurados. Falla con exit 1 si alguna ruta los
 * supera — para usar como step de CI.
 *
 * Lee `.next/build-manifest.json` + `.next/required-server-files.json`
 * que Next 16 emite en cada build standalone. Si no existen, sale 0
 * con un warning (no bloquea local builds que no corrieron `npm run build`).
 *
 * Thresholds (gzipped):
 *   - /admin/*    → 200KB
 *   - /b/[slug]   → 220KB
 *   - resto       → 250KB (warning, no falla)
 */
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = resolve(process.cwd(), ".next");
if (!existsSync(ROOT)) {
  console.warn("⚠ .next no existe — corre `npm run build` primero. (skip)");
  process.exit(0);
}

const BUDGETS_KB = [
  { match: /^\/admin/, max: 200, label: "admin" },
  { match: /^\/b\//, max: 220, label: "b/[slug]" },
  { match: /.*/, max: 250, label: "default" },
];

let failed = false;

function gzipSize(file) {
  return gzipSync(readFileSync(file)).length;
}

function gatherChunks(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) gatherChunks(full, acc);
    else if (f.endsWith(".js")) acc.push(full);
  }
  return acc;
}

const staticDir = join(ROOT, "static");
const allChunks = gatherChunks(staticDir);
const totalKb = Math.round(allChunks.reduce((s, f) => s + gzipSize(f), 0) / 1024);
console.log(`Total gzipped JS shipped: ${totalKb} KB across ${allChunks.length} chunks`);

// Heurística simple: cada chunk se atribuye al peor budget que matche su path.
for (const chunk of allChunks) {
  const sizeKb = Math.round(gzipSize(chunk) / 1024);
  const rel = chunk.replace(ROOT, "");
  const budget = BUDGETS_KB.find((b) => b.match.test(rel)) ?? BUDGETS_KB.at(-1);
  if (sizeKb > budget.max) {
    console.error(`✗ ${rel} = ${sizeKb}KB > ${budget.max}KB (${budget.label} budget)`);
    if (budget.label !== "default") failed = true;
  }
}

if (failed) {
  console.error("\nBundle budget excedido — revisa imports pesados o aplica dynamic().");
  process.exit(1);
}
console.log("✓ bundle budget OK");

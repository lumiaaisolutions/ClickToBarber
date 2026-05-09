"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

const NAV_ITEMS: { label: string; href: string; keywords: string[] }[] = [
  { label: "Dashboard", href: "/admin", keywords: ["inicio", "home", "kpi"] },
  { label: "Agenda", href: "/admin/agenda", keywords: ["citas", "calendario"] },
  { label: "Personal", href: "/admin/staff", keywords: ["barberos", "team"] },
  { label: "Servicios", href: "/admin/services", keywords: ["catálogo"] },
  { label: "Horarios", href: "/admin/business-hours", keywords: ["horario"] },
  { label: "Fila virtual", href: "/admin/walkin", keywords: ["walk-in", "queue"] },
  { label: "POS · Inventario", href: "/admin/pos", keywords: ["productos", "stock"] },
  { label: "Operación", href: "/admin/operations", keywords: ["caja", "tip", "propinas"] },
  { label: "Marketing", href: "/admin/marketing", keywords: ["retención", "campaña"] },
  { label: "Cupones", href: "/admin/coupons", keywords: ["descuento", "código"] },
  { label: "Loyalty", href: "/admin/loyalty", keywords: ["puntos", "recompensas"] },
  { label: "Referidos", href: "/admin/referrals", keywords: ["referrals", "invita"] },
  { label: "Recurrentes", href: "/admin/recurrences", keywords: ["suscripción", "repetir"] },
  { label: "Reseñas", href: "/admin/ratings", keywords: ["reviews", "estrellas"] },
  { label: "Galería", href: "/admin/gallery", keywords: ["fotos", "antes después"] },
  { label: "Insights", href: "/admin/insights", keywords: ["smart", "stock", "predicción"] },
  { label: "Finanzas", href: "/admin/finance", keywords: ["dinero", "ingresos"] },
  { label: "Identidad", href: "/admin/identity", keywords: ["branding", "colores"] },
  { label: "Calendario sync", href: "/admin/calendar", keywords: ["google"] },
  { label: "Dominios", href: "/admin/domains", keywords: ["dns", "white-label"] },
  { label: "API & Webhooks", href: "/admin/platform", keywords: ["api", "webhook", "integración"] },
  { label: "Seguridad", href: "/admin/security/2fa", keywords: ["2fa", "totp"] },
  { label: "Bitácora", href: "/admin/audit", keywords: ["audit", "log"] },
  { label: "Suscripción", href: "/admin/billing", keywords: ["plan", "pago"] },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = /Mac/i.test(navigator.platform);
      const trigger = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k";
      if (trigger) {
        e.preventDefault();
        setOpen((v) => !v);
        setQ("");
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const [serverResults, setServerResults] = useState<Array<{ kind: string; label: string; sub?: string; href: string }>>([]);

  useEffect(() => {
    if (q.trim().length < 2) { setServerResults([]); return; }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) {
          const data = await res.json();
          setServerResults(Array.isArray(data?.results) ? data.results : []);
        }
      } catch {}
    }, 200);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [q]);

  const navMatches: Array<{ kind: string; label: string; href: string; sub?: string }> = q.trim() === ""
    ? NAV_ITEMS.map((i) => ({ kind: "nav", label: i.label, href: i.href }))
    : NAV_ITEMS.filter((i) => {
        const haystack = `${i.label} ${i.keywords.join(" ")}`.toLowerCase();
        return haystack.includes(q.toLowerCase());
      }).map((i) => ({ kind: "nav", label: i.label, href: i.href }));

  const items = [...serverResults, ...navMatches];

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-sm pt-16 sm:pt-24 px-4 flex items-start justify-center" onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="card-paper w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-line-fine">
          <Search size={16} className="text-ink-muted shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(items.length - 1, i + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
              if (e.key === "Enter" && items[active]) go(items[active].href);
            }}
            placeholder="Ir a… (escribe agenda, productos, cupón)"
            className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-muted text-sm"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono bg-bg-vellum px-1.5 py-0.5 rounded border border-line-medium text-ink-muted">ESC</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-1">
          {items.length === 0 ? (
            <li className="px-5 py-6 text-sm text-ink-muted text-center">Sin resultados</li>
          ) : items.map((item, i) => (
            <li key={`${item.kind}-${item.href}-${i}`}>
              <button
                type="button"
                onClick={() => go(item.href)}
                onMouseEnter={() => setActive(i)}
                className={
                  "w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 text-left text-sm " +
                  (i === active ? "bg-primary/8 text-primary" : "text-ink-2")
                }
              >
                <span className="flex items-center gap-2 min-w-0">
                  {item.kind !== "nav" && (
                    <span className="text-[9px] tracking-imperial bg-bg-vellum text-ink-muted px-1.5 py-0.5 rounded">
                      {item.kind}
                    </span>
                  )}
                  <span className="truncate">{item.label}</span>
                  {item.sub && <span className="text-ink-muted text-xs truncate">· {item.sub}</span>}
                </span>
                <ArrowRight size={12} className="text-ink-muted shrink-0" />
              </button>
            </li>
          ))}
        </ul>
        <div className="hidden sm:flex items-center gap-3 px-5 py-2 border-t border-line-fine text-[10px] text-ink-muted font-mono">
          <span>↑↓ navegar</span>
          <span>↵ ir</span>
          <span>esc cerrar</span>
        </div>
      </div>
    </div>
  );
}

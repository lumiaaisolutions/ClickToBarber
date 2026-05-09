"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X, ChevronDown } from "lucide-react";

const STORAGE_KEY = "lumia:cookie-consent";

interface Consent {
  decided_at: number;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

/**
 * Cookie consent banner GDPR/ePrivacy con categorías granulares.
 * Re-pide consent tras 1 año (cumple GDPR refresh anual).
 */
export function CookieConsentBanner() {
  const [decided, setDecided] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) { setDecided(false); return; }
    try {
      const stored = JSON.parse(raw) as Consent;
      const ageDays = (Date.now() - stored.decided_at) / 86400000;
      if (ageDays > 365) { setDecided(false); return; }
      setDecided(true);
    } catch {
      setDecided(false);
    }
  }, []);

  function persist(consent: Omit<Consent, "decided_at" | "necessary">) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      decided_at: Date.now(), necessary: true, ...consent,
    }));
    setDecided(true);
    // Notifica a <Analytics /> para que cargue PH/GA si analytics=true.
    window.dispatchEvent(new Event("lumia:consent:updated"));
  }

  if (decided !== false) return null;

  return (
    <div role="region" aria-label="Aviso de cookies"
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:left-4 sm:bottom-4 z-[60] max-w-[calc(100%-2rem)] sm:max-w-md mx-auto sm:mx-0">
      <div className="card-paper p-4 sm:p-5 flex flex-col gap-3 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent-3 shrink-0">
            <Cookie size={16} />
          </div>
          <div className="text-sm text-ink-2 leading-relaxed flex-1 min-w-0">
            Usamos cookies necesarias para que LUMIA funcione. Con tu permiso,
            también medimos uso anónimo. <Link href="/cookies" className="text-primary underline">Más info</Link>
          </div>
          <button aria-label="Cerrar" onClick={() => persist({ analytics: false, marketing: false })}
            className="text-ink-muted hover:text-ink p-1 shrink-0">
            <X size={16} />
          </button>
        </div>

        {expanded && (
          <div className="space-y-2 border-t border-line-fine pt-3">
            <Row label="Necesarias" desc="Sesión + idioma. No se pueden desactivar." disabled checked />
            <Row label="Analíticas" desc="Métricas anónimas para mejorar el producto."
                 checked={analytics} onChange={setAnalytics} />
            <Row label="Marketing" desc="Retargeting. No usamos hoy."
                 checked={marketing} onChange={setMarketing} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button onClick={() => setExpanded((v) => !v)} className="btn btn-ghost text-xs justify-center inline-flex items-center gap-1">
            <ChevronDown size={11} className={expanded ? "rotate-180" : ""} /> Personalizar
          </button>
          <button onClick={() => persist({ analytics: false, marketing: false })} className="btn btn-ghost text-xs justify-center">
            Solo necesarias
          </button>
          <button onClick={() => expanded ? persist({ analytics, marketing }) : persist({ analytics: true, marketing: true })}
            className="btn btn-primary text-xs justify-center">
            {expanded ? "Guardar" : "Aceptar todo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label, desc, checked, onChange, disabled,
}: { label: string; desc: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)} className="mt-0.5" />
      <div className="min-w-0">
        <div className="text-xs font-display italic text-ink">{label}</div>
        <div className="text-[10px] text-ink-2 leading-snug">{desc}</div>
      </div>
    </label>
  );
}

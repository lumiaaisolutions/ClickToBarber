"use client";

import { useEffect } from "react";

const STORAGE_KEY = "lumia:cookie-consent";

interface Consent {
  decided_at: number;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

/**
 * Carga GA / PostHog SOLO si el usuario aceptó la categoría "analíticas"
 * en el cookie consent banner. Si no hay env vars configuradas, no hace
 * nada (silent no-op).
 *
 * Re-engancha al evento 'lumia:consent:updated' que dispara el banner
 * cuando el usuario decide en una segunda visita.
 *
 * Env (NEXT_PUBLIC_*):
 *   NEXT_PUBLIC_POSTHOG_KEY=phc_...
 *   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
 *   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
 */
export function Analytics() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let loaded = false;

    function tryLoad() {
      if (loaded) return;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      let consent: Consent | null = null;
      try { consent = JSON.parse(raw) as Consent; } catch { return; }
      if (!consent?.analytics) return;
      loaded = true;

      const phKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const phHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
      const gaId = process.env.NEXT_PUBLIC_GA_ID;

      if (phKey) loadPostHog(phKey, phHost);
      if (gaId) loadGA(gaId);
    }

    tryLoad();
    window.addEventListener("lumia:consent:updated", tryLoad);
    return () => window.removeEventListener("lumia:consent:updated", tryLoad);
  }, []);

  return null;
}

function loadPostHog(key: string, host: string) {
  // Snippet oficial PostHog v1.0 simplificado.
  const s = document.createElement("script");
  s.async = true;
  s.src = `${host}/static/array.js`;
  s.onload = () => {
    type PHWindow = Window & { posthog?: { init: (k: string, c: { api_host: string; capture_pageview?: boolean }) => void } };
    const w = window as PHWindow;
    w.posthog?.init(key, { api_host: host, capture_pageview: true });
  };
  document.head.appendChild(s);
}

function loadGA(id: string) {
  const s1 = document.createElement("script");
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s1);

  const s2 = document.createElement("script");
  s2.text = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', '${id}', { anonymize_ip: true });
  `;
  document.head.appendChild(s2);
}

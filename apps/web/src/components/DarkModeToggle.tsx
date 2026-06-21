"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Toggle de modo claro/oscuro. Persiste en localStorage; respeta
 * `prefers-color-scheme` la primera vez. El sistema de presets light/dark
 * vive como atributo `data-mode` en `<html>` — los tokens cromáticos del
 * `BrandingProvider` ya escuchan ese atributo.
 */
export function DarkModeToggle() {
  const [mode, setMode] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const stored = window.localStorage.getItem("lumia:mode") as "light" | "dark" | null;
    const initial = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-mode", initial);
    setMode(initial);
  }, []);

  function toggle() {
    const next = mode === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-mode", next);
    window.localStorage.setItem("lumia:mode", next);
    setMode(next);
  }

  if (mode === null) {
    return <div className="w-9 h-9 rounded-full bg-bg-vellum/40" aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="w-9 h-9 rounded-full bg-bg-vellum border border-line-medium hover:border-primary/40 text-ink-2 hover:text-primary transition-all flex items-center justify-center"
    >
      {mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

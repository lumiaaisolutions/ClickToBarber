"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import type { Locale } from "@/lib/i18n";

export function LocaleSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(locale: Locale) {
    if (locale === current) return;
    startTransition(async () => {
      await fetch("/api/i18n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      router.refresh();
    });
  }

  return (
    <div className="inline-flex items-center gap-1 text-xs text-ink-muted">
      <Globe size={12} />
      <button
        type="button"
        onClick={() => pick("es")}
        disabled={pending}
        aria-pressed={current === "es"}
        className={`px-1.5 py-0.5 rounded hover:text-primary transition ${current === "es" ? "text-primary" : ""}`}
      >
        ES
      </button>
      <span className="text-ink-muted/40">·</span>
      <button
        type="button"
        onClick={() => pick("en")}
        disabled={pending}
        aria-pressed={current === "en"}
        className={`px-1.5 py-0.5 rounded hover:text-primary transition ${current === "en" ? "text-primary" : ""}`}
      >
        EN
      </button>
    </div>
  );
}

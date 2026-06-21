/**
 * Helper de traducción cliente/servidor.
 *
 *   import { t } from "@/lib/i18n";
 *   t("landing", "hero.title.1", locale)
 *
 * El locale se detecta server-side desde la cookie `lumia_locale` y se
 * propaga por props. Cliente puede leer/escribir vía `useLocale()`.
 */
import { dict, DEFAULT_LOCALE, type Locale, type Namespace } from "./dict";

export const LOCALE_COOKIE = "lumia_locale";

export function t<N extends Namespace>(
  ns: N,
  key: keyof (typeof dict.es)[N] | string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const localized = dict[locale]?.[ns] as Record<string, string> | undefined;
  const fallback = dict[DEFAULT_LOCALE][ns] as Record<string, string>;
  return localized?.[key as string] ?? fallback[key as string] ?? (key as string);
}

/** Server-only: lee la cookie. Llamar dentro de Server Components. */
export async function getServerLocale(): Promise<Locale> {
  const { cookies } = await import("next/headers");
  const c = await cookies();
  const v = c.get(LOCALE_COOKIE)?.value;
  return (v === "en" ? "en" : "es") as Locale;
}

export type { Locale };
export { DEFAULT_LOCALE, LOCALES } from "./dict";

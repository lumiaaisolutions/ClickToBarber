/**
 * Diccionario de traducciones LUMIA.
 *
 * Mantén las KEYS estables — el componente las usa como `t("hero.title")`.
 * Cuando agregues una nueva sección, agrégala primero en `es` (canonical)
 * y luego propaga a `en`. Si una key falta en `en`, el helper hace fallback
 * a `es` automáticamente.
 *
 * Para extender (ej. portal admin), agrega un nuevo namespace top-level
 * — no metas todas las cadenas en `landing`.
 */

export type Locale = "es" | "en";

export const DEFAULT_LOCALE: Locale = "es";
export const LOCALES: Locale[] = ["es", "en"];

export const dict = {
  es: {
    landing: {
      // Hero
      "hero.eyebrow": "Software de barbería",
      "hero.title.1": "Diseñado para",
      "hero.title.2": "barberías premium",
      "hero.subtitle": "Reservas online, anti no-show con WhatsApp y un portal con tu identidad. Suscripción mensual con plan gratis para siempre.",
      "hero.cta.primary": "Empezar gratis",
      "hero.cta.secondary": "Ver demo",

      // Pricing
      "pricing.eyebrow": "Planes",
      "pricing.title": "Crece sin fricción",
      "pricing.cta.start": "Empezar",
      "pricing.cta.contact": "Contactar",
      "pricing.cycle.monthly": "Mensual",
      "pricing.cycle.yearly": "Anual",
      "pricing.yearly.discount": "2 meses gratis",

      // Footer
      "footer.tagline": "El software de barbería diseñado en México.",
      "footer.legal.terms": "Términos",
      "footer.legal.privacy": "Privacidad",
      "footer.legal.cookies": "Cookies",
      "footer.copyright": "Todos los derechos reservados.",
      "footer.affiliates": "Programa de afiliados",
    },
    common: {
      "language.es": "Español",
      "language.en": "English",
      "language.switch": "Cambiar idioma",
    },
  },
  en: {
    landing: {
      "hero.eyebrow": "Barbershop software",
      "hero.title.1": "Built for",
      "hero.title.2": "premium barbershops",
      "hero.subtitle": "Online booking, anti no-show via WhatsApp, and a customer portal with your own identity. Monthly subscription with a free-forever tier.",
      "hero.cta.primary": "Start free",
      "hero.cta.secondary": "Watch demo",

      "pricing.eyebrow": "Plans",
      "pricing.title": "Scale without friction",
      "pricing.cta.start": "Get started",
      "pricing.cta.contact": "Contact us",
      "pricing.cycle.monthly": "Monthly",
      "pricing.cycle.yearly": "Yearly",
      "pricing.yearly.discount": "2 months free",

      "footer.tagline": "The barbershop software designed in Mexico.",
      "footer.legal.terms": "Terms",
      "footer.legal.privacy": "Privacy",
      "footer.legal.cookies": "Cookies",
      "footer.copyright": "All rights reserved.",
      "footer.affiliates": "Affiliate program",
    },
    common: {
      "language.es": "Español",
      "language.en": "English",
      "language.switch": "Switch language",
    },
  },
} as const;

export type Namespace = keyof typeof dict.es;
export type Key<N extends Namespace> = keyof (typeof dict.es)[N];

import { NextResponse } from "next/server";
import { LOCALE_COOKIE, LOCALES } from "@/lib/i18n";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const locale = body && typeof body === "object" && "locale" in body ? String((body as { locale: unknown }).locale) : "";
  if (!LOCALES.includes(locale as (typeof LOCALES)[number])) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

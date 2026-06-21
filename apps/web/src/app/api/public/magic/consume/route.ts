import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE, AUTH_COOKIE, TENANT_COOKIE, type SessionPayload } from "@/lib/auth";

/**
 * POST /api/public/magic/consume
 *
 * Consume un magic link (token de onboarding emitido tras pago Stripe).
 * Si es válido, el backend devuelve un token Sanctum corto-vivo (1h);
 * lo guardamos en la cookie httpOnly para que el wizard de onboarding
 * funcione igual que un login normal.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.token !== "string") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const upstream = await fetch(`${API_BASE}/public/magic/consume`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token: body.token }),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return NextResponse.json(data ?? { error: "magic_consume_failed" }, {
      status: upstream.status,
    });
  }

  const session = data as SessionPayload;
  if (!session?.token) {
    return NextResponse.json({ error: "no_token" }, { status: 502 });
  }

  const store = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  const baseOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: 60 * 60, // 1h, alineado con el TTL del Sanctum token de magic link
  };

  store.set(AUTH_COOKIE, session.token, baseOpts);
  if (session.tenant?.slug) {
    store.set(TENANT_COOKIE, session.tenant.slug, { ...baseOpts, httpOnly: false });
  }

  return NextResponse.json({ user: session.user, tenant: session.tenant });
}

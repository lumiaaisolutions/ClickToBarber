import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE, AUTH_COOKIE, TENANT_COOKIE, type SessionPayload } from "@/lib/auth";

/**
 * POST /api/auth/2fa/verify
 *
 * Recibe { login_token, code } del cliente. Si el código es válido, el backend
 * devuelve un token Sanctum completo y aquí lo persistimos en cookie httpOnly.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.login_token !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const upstream = await fetch(`${API_BASE}/auth/2fa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ login_token: body.login_token, code: body.code }),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return NextResponse.json(data ?? { error: "verify_failed" }, { status: upstream.status });
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
    maxAge: 60 * 60 * 24 * 30,
  };

  store.set(AUTH_COOKIE, session.token, baseOpts);
  if (session.tenant?.slug) {
    store.set(TENANT_COOKIE, session.tenant.slug, { ...baseOpts, httpOnly: false });
  }

  return NextResponse.json({ user: session.user, tenant: session.tenant });
}

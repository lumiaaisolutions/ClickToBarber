import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE, AUTH_COOKIE, TENANT_COOKIE, type SessionPayload } from "@/lib/auth";

/**
 * POST /api/auth/login (route handler de Next).
 *
 * Recibe { email, password }, llama al backend Laravel /api/auth/login,
 * y si el login es exitoso guarda el token Sanctum en una cookie httpOnly.
 * El navegador nunca ve el token; toda llamada server-side a /api/admin/*
 * lo forwardea automáticamente desde la cookie.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const upstream = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
    cache: "no-store",
  });

  const text = await upstream.text();
  const data = text ? safeParse(text) : null;

  if (!upstream.ok) {
    return NextResponse.json(data ?? { error: "login_failed" }, { status: upstream.status });
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

  return NextResponse.json({
    user: session.user,
    tenant: session.tenant,
  });
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE, AUTH_COOKIE, TENANT_COOKIE } from "@/lib/auth";

async function performLogout() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;

  if (token) {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }).catch(() => null);
  }

  store.delete(AUTH_COOKIE);
  store.delete(TENANT_COOKIE);
}

export async function POST() {
  await performLogout();
  return NextResponse.json({ ok: true });
}

/**
 * GET — limpia la cookie y redirige a /login. Útil cuando un Server Component
 * detecta token inválido y necesita escapar del loop /login → /admin → /login.
 */
export async function GET(request: Request) {
  await performLogout();
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url, 303);
}

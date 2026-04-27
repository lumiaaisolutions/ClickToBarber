import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE, AUTH_COOKIE, TENANT_COOKIE } from "@/lib/auth";

export async function POST() {
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

  return NextResponse.json({ ok: true });
}

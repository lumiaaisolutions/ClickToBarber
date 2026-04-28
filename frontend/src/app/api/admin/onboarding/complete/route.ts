import { NextResponse } from "next/server";
import { API_BASE, serverAuthHeader } from "@/lib/auth";

/**
 * POST /api/admin/onboarding/complete (proxy al backend Laravel).
 * Forwardea el token Sanctum desde la cookie httpOnly. Espera el mismo
 * payload que el endpoint /api/admin/onboarding/complete del backend.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const upstream = await fetch(`${API_BASE}/admin/onboarding/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(await serverAuthHeader()),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await upstream.text();
  const data = text ? safeParse(text) : null;

  return NextResponse.json(data ?? { ok: upstream.ok }, { status: upstream.status });
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

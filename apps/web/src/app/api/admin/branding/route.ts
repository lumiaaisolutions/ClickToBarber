import { NextResponse } from "next/server";
import { API_BASE, serverAuthHeader } from "@/lib/auth";

/** PUT /api/admin/branding — proxy autenticado al backend Laravel. */
export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);

  const upstream = await fetch(`${API_BASE}/admin/branding`, {
    method: "PUT",
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

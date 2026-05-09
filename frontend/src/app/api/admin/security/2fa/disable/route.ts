import { NextResponse } from "next/server";
import { API_BASE, serverAuthHeader } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const upstream = await fetch(`${API_BASE}/admin/security/2fa/disable`, {
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
  try {
    return NextResponse.json(text ? JSON.parse(text) : { ok: upstream.ok }, {
      status: upstream.status,
    });
  } catch {
    return NextResponse.json({ error: "bad_response" }, { status: 502 });
  }
}

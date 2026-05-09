import { NextResponse } from "next/server";
import { API_BASE, serverAuthHeader } from "@/lib/auth";

export async function POST() {
  const upstream = await fetch(`${API_BASE}/admin/security/2fa/setup`, {
    method: "POST",
    headers: { Accept: "application/json", ...(await serverAuthHeader()) },
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

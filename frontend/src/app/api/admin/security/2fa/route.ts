import { NextResponse } from "next/server";
import { API_BASE, serverAuthHeader } from "@/lib/auth";

async function proxy(method: "GET" | "POST", path: string, body?: unknown) {
  const upstream = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(await serverAuthHeader()),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await upstream.text();
  return NextResponse.json(text ? safeParse(text) : { ok: upstream.ok }, {
    status: upstream.status,
  });
}

export async function GET() {
  return proxy("GET", "/admin/security/2fa");
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export { proxy };

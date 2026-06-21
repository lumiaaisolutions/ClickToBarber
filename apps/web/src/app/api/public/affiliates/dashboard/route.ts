import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const upstream = await fetch(`${API_BASE}/public/affiliates/dashboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await upstream.text();
  return NextResponse.json(text ? safe(text) : { ok: upstream.ok }, { status: upstream.status });
}

function safe(s: string): unknown { try { return JSON.parse(s); } catch { return null; } }

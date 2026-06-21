import { NextResponse } from "next/server";
import { API_BASE, serverAuthHeader } from "@/lib/auth";

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  const upstream = await fetch(`${API_BASE}/admin/agenda${search}`, {
    headers: { Accept: "application/json", ...(await serverAuthHeader()) },
    cache: "no-store",
  });
  const text = await upstream.text();
  return NextResponse.json(text ? safe(text) : { ok: upstream.ok }, { status: upstream.status });
}

function safe(s: string): unknown { try { return JSON.parse(s); } catch { return null; } }

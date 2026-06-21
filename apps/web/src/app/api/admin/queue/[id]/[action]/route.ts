import { NextResponse } from "next/server";
import { API_BASE, serverAuthHeader } from "@/lib/auth";

export async function POST(_: Request, ctx: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await ctx.params;
  if (!["call", "serve", "abandon"].includes(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }
  const upstream = await fetch(`${API_BASE}/admin/queue/${id}/${action}`, {
    method: "POST",
    headers: { Accept: "application/json", ...(await serverAuthHeader()) },
    cache: "no-store",
  });
  const text = await upstream.text();
  return NextResponse.json(text ? safe(text) : { ok: upstream.ok }, { status: upstream.status });
}
function safe(s: string): unknown { try { return JSON.parse(s); } catch { return null; } }

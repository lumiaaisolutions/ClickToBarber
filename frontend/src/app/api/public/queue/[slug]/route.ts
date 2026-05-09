import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/auth";

export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const upstream = await fetch(`${API_BASE}/public/queue/${encodeURIComponent(slug)}`, { cache: "no-store" });
  const text = await upstream.text();
  return NextResponse.json(text ? safe(text) : { ok: upstream.ok }, { status: upstream.status });
}

function safe(s: string): unknown { try { return JSON.parse(s); } catch { return null; } }

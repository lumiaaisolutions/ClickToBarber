import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/auth";

export async function GET(_request: Request, ctx: { params: Promise<{ slug: string; code: string }> }) {
  const { slug, code } = await ctx.params;
  const upstream = await fetch(
    `${API_BASE}/public/giftcards/${encodeURIComponent(slug)}/${encodeURIComponent(code)}`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  const text = await upstream.text();
  return NextResponse.json(text ? safe(text) : { ok: upstream.ok }, { status: upstream.status });
}

function safe(s: string): unknown { try { return JSON.parse(s); } catch { return null; } }

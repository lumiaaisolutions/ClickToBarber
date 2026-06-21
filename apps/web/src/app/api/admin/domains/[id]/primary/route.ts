import { NextResponse } from "next/server";
import { API_BASE, serverAuthHeader } from "@/lib/auth";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const upstream = await fetch(`${API_BASE}/admin/domains/${id}/primary`, {
    method: "POST",
    headers: { Accept: "application/json", ...(await serverAuthHeader()) },
    cache: "no-store",
  });
  const text = await upstream.text();
  return NextResponse.json(text ? safeParse(text) : { ok: upstream.ok }, { status: upstream.status });
}

function safeParse(s: string): unknown { try { return JSON.parse(s); } catch { return null; } }

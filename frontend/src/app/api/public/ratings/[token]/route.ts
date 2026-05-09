import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/auth";

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const body = await request.json().catch(() => null);

  const upstream = await fetch(
    `${API_BASE}/public/ratings/${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    },
  );
  const text = await upstream.text();
  return NextResponse.json(text ? safeParse(text) : { ok: upstream.ok }, {
    status: upstream.status,
  });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

import { NextResponse } from "next/server";
import { API_BASE, serverAuthHeader } from "@/lib/auth";

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const upstream = await fetch(`${API_BASE}/admin/coupons/${id}`, {
    method: "DELETE",
    headers: { Accept: "application/json", ...(await serverAuthHeader()) }, cache: "no-store",
  });
  const text = await upstream.text();
  return NextResponse.json(text ? safe(text) : { ok: upstream.ok }, { status: upstream.status });
}
function safe(s: string): unknown { try { return JSON.parse(s); } catch { return null; } }

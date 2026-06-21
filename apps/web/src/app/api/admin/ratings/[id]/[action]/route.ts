import { NextResponse } from "next/server";
import { API_BASE, serverAuthHeader } from "@/lib/auth";
export async function POST(_: Request, ctx: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await ctx.params;
  if (!["publish", "unpublish"].includes(action)) return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  const upstream = await fetch(`${API_BASE}/admin/ratings/${id}/${action}`, {
    method: "POST",
    headers: { Accept: "application/json", ...(await serverAuthHeader()) }, cache: "no-store",
  });
  return NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status });
}

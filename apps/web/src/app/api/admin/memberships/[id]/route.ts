import { NextResponse } from "next/server";
import { API_BASE, serverAuthHeader } from "@/lib/auth";
export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const upstream = await fetch(`${API_BASE}/admin/memberships/${id}`, {
    method: "DELETE",
    headers: { Accept: "application/json", ...(await serverAuthHeader()) }, cache: "no-store",
  });
  return NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status });
}

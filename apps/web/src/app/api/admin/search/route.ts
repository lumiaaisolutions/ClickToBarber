import { NextResponse } from "next/server";
import { API_BASE, serverAuthHeader } from "@/lib/auth";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const upstream = await fetch(`${API_BASE}/admin/search?q=${encodeURIComponent(q)}`, {
    headers: { Accept: "application/json", ...(await serverAuthHeader()) }, cache: "no-store",
  });
  return NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status });
}

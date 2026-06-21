import { NextResponse } from "next/server";
import { API_BASE, serverAuthHeader } from "@/lib/auth";

export async function POST() {
  const upstream = await fetch(`${API_BASE}/admin/notifications/read`, {
    method: "POST",
    headers: { Accept: "application/json", ...(await serverAuthHeader()) }, cache: "no-store",
  });
  return NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status });
}

import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const upstream = await fetch(`${API_BASE}/public/me/data-export`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  // Pasamos el body como JSON para que el browser lo descargue.
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "attachment; filename=lumia-mis-datos.json",
    },
  });
}

import { NextResponse } from "next/server";
import { API_BASE, serverAuthHeader } from "@/lib/auth";

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const upstream = await fetch(`${API_BASE}/admin/catalog/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(await serverAuthHeader()),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await upstream.text();
  return NextResponse.json(text ? safeParse(text) : { ok: upstream.ok }, {
    status: upstream.status,
  });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const upstream = await fetch(`${API_BASE}/admin/catalog/products/${id}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(await serverAuthHeader()),
    },
    cache: "no-store",
  });
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

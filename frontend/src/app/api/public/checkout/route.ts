import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/auth";

/**
 * POST /api/public/checkout
 *
 * Recibe { plan, billing_cycle, email, business_name } y reenvía al backend
 * Laravel para crear una sesión de Stripe Checkout. Devuelve la URL al
 * cliente para que redirija a Stripe.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const upstream = await fetch(`${API_BASE}/public/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => null);
  return NextResponse.json(data ?? { error: "checkout_failed" }, {
    status: upstream.status,
  });
}

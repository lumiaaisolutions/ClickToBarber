/**
 * Helpers de auth compartidos por route handlers, server components y middleware.
 */

export const AUTH_COOKIE = "bp_token";
export const TENANT_COOKIE = "bp_tenant";

export interface SessionPayload {
  token: string;
  user: { id: number; name: string; email: string; role: string };
  tenant: { id: string; slug: string; name: string; plan: number | null } | null;
}

export const API_BASE =
  process.env.BARBERPRO_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000/api";

/**
 * Forwardea la cookie de sesión al backend Laravel como Bearer token.
 * Llamar sólo desde Server Components / Route Handlers (necesita next/headers).
 */
export async function serverAuthHeader(): Promise<Record<string, string>> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Cliente HTTP del API LUMIA.
 * Maneja:
 *   - Authorization: Bearer <token Sanctum> leído de la cookie httpOnly
 *     en server components (vía next/headers).
 *   - Header X-Tenant opcional para endpoints públicos del cliente
 *     (booking) que no tienen sesión.
 *   - 402 (feature_locked) → throw FeatureLockedError
 *   - 401 (sin sesión) → throw UnauthenticatedError
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message?: string) {
    super(message ?? `API ${status}`);
  }
}

export class FeatureLockedError extends ApiError {
  constructor(public feature: string, public requiredPlan: string | null, body: unknown) {
    super(402, body, `Feature locked: ${feature}`);
  }
}

export class UnauthenticatedError extends ApiError {
  constructor(body: unknown) {
    super(401, body, "Unauthenticated");
  }
}

export interface FetchOptions extends Omit<RequestInit, "body"> {
  tenant?: string;
  authed?: boolean; // true → forwardea cookie Sanctum desde el server
  body?: unknown;
}

export async function api<T = unknown>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { tenant, body, headers: extraHeaders, authed, ...rest } = opts;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(extraHeaders as Record<string, string> | undefined),
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (tenant) headers["X-Tenant"] = tenant;

  if (authed && typeof window === "undefined") {
    const { serverAuthHeader } = await import("@/lib/auth");
    Object.assign(headers, await serverAuthHeader());
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
    cache: "no-store",
  });

  const text = await res.text();
  const parsed = text ? safeJson(text) : null;

  if (!res.ok) {
    if (res.status === 402 && parsed && typeof parsed === "object" && "feature" in parsed) {
      throw new FeatureLockedError(
        (parsed as { feature: string }).feature,
        (parsed as { required_plan?: string | null }).required_plan ?? null,
        parsed,
      );
    }
    if (res.status === 401) {
      throw new UnauthenticatedError(parsed ?? text);
    }
    throw new ApiError(res.status, parsed ?? text);
  }

  return parsed as T;
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}

// ---------- Tipos compartidos (espejo del backend) ----------
export type PlanCode = "free" | "starter" | "pro" | "enterprise";

export interface Plan {
  code: PlanCode;
  name: string;
  description: string;
  price_cents: number;
  price: string;
  features: string[];
  max_barbers: number | null;
}

export interface PublicTenant {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  cover_image: string | null;
  logo: string | null;
  timezone: string;
  deposit_pct: number;
  plan: { code: PlanCode | null; name: string | null };
}

export interface PublicBarber {
  id: number;
  name: string;
  avatar: string | null;
  specialties: string[];
  bio: string | null;
}

export interface PublicService {
  id: number;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  price_formatted: string;
  image: string | null;
}

export interface AppointmentDto {
  id: number;
  starts_at: string;
  ends_at: string;
  status: string;
  status_label: string;
  price_cents: number;
  deposit_cents: number;
  deposit_status: string;
  barber: { id: number; name: string };
  service: { id: number; name: string };
  client: { id: number; name: string; email: string };
}

export interface DashboardKpis {
  today_appointments: number;
  month_appointments: number;
  month_revenue_cents: number;
  month_revenue: string;
  total_clients: number;
  inactive_clients_30d: number;
}

export interface DashboardResponse {
  tenant: { id: string; name: string; slug: string; plan: PlanCode | null };
  kpis: DashboardKpis;
  features: string[];
}

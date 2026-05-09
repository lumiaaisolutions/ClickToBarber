/**
 * Helpers server-side para el portal Admin.
 * Todas las llamadas envían el Bearer token Sanctum desde la cookie httpOnly;
 * el backend resuelve el tenant directamente del usuario autenticado.
 */
import { api, type DashboardResponse, type AppointmentDto } from "@/lib/api";

const authed = { authed: true } as const;

export async function getDashboard(): Promise<DashboardResponse> {
  return api<DashboardResponse>("/admin/dashboard", authed);
}

export async function getAgenda(from: string, to: string): Promise<{ data: AppointmentDto[] }> {
  return api<{ data: AppointmentDto[] }>(`/admin/agenda?from=${from}&to=${to}`, authed);
}

export async function getStaff() {
  return api<Array<{
    id: number; name: string; email: string | null; phone: string | null; avatar: string | null;
    specialties: string[]; commission_pct: number; is_active: boolean;
    shifts: Array<{ weekday: number; start: string; end: string }>;
    services_count: number;
  }>>("/admin/staff", authed);
}

export async function getServicesAdmin() {
  return api<Array<{ id: number; name: string; description: string | null; duration_minutes: number; price_cents: number; currency: string; is_active: boolean }>>(
    "/admin/catalog/services", authed,
  );
}

export async function getProductsAdmin() {
  return api<Array<{ id: number; name: string; sku: string; description: string | null; price_cents: number; cost_cents: number | null; currency: string; stock: number; stock_min: number; low_stock: boolean; is_active: boolean }>>(
    "/admin/catalog/products", authed,
  );
}

export async function getMe() {
  return api<{
    user: {
      id: number; name: string; email: string; role: string;
      first_login_at: string | null;
      can_write: boolean;
      can_see_finance: boolean;
    };
    tenant: { id: string; slug: string; name: string; plan: number } | null;
  }>("/auth/me", authed);
}

export async function getInactive() {
  return api<{ days_threshold: number; count: number; clients: Array<{ id: number; name: string; email: string; phone: string; last_visit: string | null; days_since: number | null }> }>(
    "/admin/marketing/inactive", authed,
  );
}

export async function getFinance() {
  return api<{ period: { from: string; to: string }; gross_cents: number; by_purpose: Record<string, number>; by_provider: Record<string, number>; commissions: Array<{ barber: string; tickets: number; gross_cents: number; commission_cents: number }> }>(
    "/admin/finance/summary", authed,
  );
}

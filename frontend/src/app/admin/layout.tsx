import { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { OnboardingTour } from "@/components/admin/OnboardingTour";
import { BrandingProvider } from "@/components/branding/BrandingProvider";
import { FALLBACK_BRANDING, fetchAdminBranding } from "@/lib/branding-api";
import { AUTH_COOKIE, serverAuthHeader, API_BASE } from "@/lib/auth";

interface MeResponse {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    first_login_at: string | null;
    can_write?: boolean;
    can_see_finance?: boolean;
  };
  tenant: { id: string; slug: string; name: string } | null;
}

async function getMe(): Promise<MeResponse | "unauthorized" | "error"> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Accept: "application/json", ...(await serverAuthHeader()) },
      cache: "no-store",
    });
    if (res.status === 401) return "unauthorized";
    if (!res.ok) return "error";
    return (await res.json()) as MeResponse;
  } catch {
    return "error";
  }
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  const headerList = await headers();
  const pathname = headerList.get("x-invoke-path") ?? headerList.get("x-pathname") ?? "";
  const isLoginPage = pathname.endsWith("/admin/login") || pathname === "/login";
  const isOnboardingPage = pathname.endsWith("/admin/onboarding");
  const hasCookie = Boolean(store.get(AUTH_COOKIE)?.value);

  if (isLoginPage || !hasCookie) {
    return <div className="relative z-10 min-h-screen">{children}</div>;
  }

  const me = await getMe();

  // Cookie inválida o token expirado: pasamos por el route handler que la
  // borra antes de redirigir al login. Si redirigiéramos directo a /login
  // sin borrar la cookie, /login la vería y volvería a empujar a /admin,
  // causando un loop de history.replaceState().
  if (me === "unauthorized") {
    redirect("/api/auth/logout");
  }

  if (me === "error" || me === null) {
    return (
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="card-paper p-10 text-center max-w-md">
          <div className="text-danger font-display italic text-2xl mb-2">No se pudo conectar</div>
          <div className="text-sm text-ink-2">
            Asegúrate de que <code className="font-mono text-primary">php artisan serve</code> esté corriendo en :8000.
          </div>
        </div>
      </div>
    );
  }

  // Carga branding del tenant para envolver el subtree
  const branding = (await fetchAdminBranding()) ?? FALLBACK_BRANDING;

  // Si es primer login y NO está en /admin/onboarding, redirige al wizard
  const needsOnboarding = me.user.first_login_at === null;
  if (needsOnboarding && !isOnboardingPage) {
    redirect("/admin/onboarding");
  }

  // Si onboarding ya completado pero está en la ruta de onboarding, redirige al dashboard
  if (!needsOnboarding && isOnboardingPage) {
    redirect("/admin");
  }

  // Página de onboarding: full-screen, sin sidebar, con branding ya aplicado
  if (isOnboardingPage) {
    return (
      <BrandingProvider branding={branding}>
        <div className="relative z-10 min-h-screen texture-paper">{children}</div>
      </BrandingProvider>
    );
  }

  return (
    <BrandingProvider branding={branding}>
      <div className="relative z-10 min-h-screen flex">
        <AdminSidebar
          userName={me.user.name}
          userEmail={me.user.email}
          userRole={me.user.role}
          canWrite={me.user.can_write}
          canSeeFinance={me.user.can_see_finance}
          tenantName={me.tenant?.name}
          tenantSlug={me.tenant?.slug ?? null}
        />
        <main className="flex-1 ml-0 lg:ml-[268px] min-h-screen pt-14 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
            {children}
          </div>
        </main>
        <OnboardingTour enabled={!!me.user.first_login_at} />
      </div>
    </BrandingProvider>
  );
}

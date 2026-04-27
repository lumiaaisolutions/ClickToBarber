import { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AUTH_COOKIE, serverAuthHeader, API_BASE } from "@/lib/auth";

interface MeResponse {
  user: { id: number; name: string; email: string; role: string };
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
  const isLoginPage = pathname.endsWith("/admin/login");
  const hasCookie = Boolean(store.get(AUTH_COOKIE)?.value);

  if (isLoginPage || !hasCookie) {
    return <div className="relative z-10 min-h-screen">{children}</div>;
  }

  const me = await getMe();

  if (me === "unauthorized") {
    redirect("/admin/login");
  }

  if (me === "error" || me === null) {
    return (
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="card-premium p-10 text-center max-w-md">
          <div className="text-danger font-medium mb-2">No se pudo conectar con el API.</div>
          <div className="text-sm text-text-2">
            Asegúrate de que <code className="font-mono text-accent">php artisan serve</code> esté corriendo en :8000.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen flex">
      <AdminSidebar
        userName={me.user.name}
        userEmail={me.user.email}
        tenantSlug={me.tenant?.slug ?? null}
      />
      <main className="flex-1 ml-0 md:ml-[260px] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

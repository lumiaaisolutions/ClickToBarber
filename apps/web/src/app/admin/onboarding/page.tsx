import { OnboardingWizard } from "@/components/admin/OnboardingWizard";
import { serverAuthHeader, API_BASE } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface MeResponse {
  user: { name: string };
  tenant: { name: string } | null;
}

export default async function OnboardingPage() {
  let initialName = "";
  let initialTenantName = "";

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Accept: "application/json", ...(await serverAuthHeader()) },
      cache: "no-store",
    });
    if (res.ok) {
      const me = (await res.json()) as MeResponse;
      initialName = me.user.name === "Sin nombre" ? "" : me.user.name;
      initialTenantName = me.tenant?.name ?? "";
    }
  } catch {
    // Si falla el /me, el wizard arranca con campos vacíos.
  }

  return <OnboardingWizard initialName={initialName} initialTenantName={initialTenantName} />;
}

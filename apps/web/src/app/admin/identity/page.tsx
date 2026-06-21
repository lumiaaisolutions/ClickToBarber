import { redirect } from "next/navigation";
import { fetchAdminBranding, FALLBACK_BRANDING } from "@/lib/branding-api";
import { API_BASE, serverAuthHeader } from "@/lib/auth";
import { BrandingEditor } from "@/components/admin/BrandingEditor";

export const dynamic = "force-dynamic";

interface MeResponse {
  user: { name: string; can_write: boolean };
  tenant: { name: string } | null;
}

export default async function IdentityPage() {
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { Accept: "application/json", ...(await serverAuthHeader()) },
    cache: "no-store",
  });
  if (!meRes.ok) redirect("/login");

  const me = (await meRes.json()) as MeResponse;
  const branding = (await fetchAdminBranding()) ?? FALLBACK_BRANDING;

  return (
    <div className="space-y-10">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Identidad visual</div>
        <h1 className="font-display italic text-5xl text-ink leading-tight">Tu marca, tu portal.</h1>
        <p className="text-ink-2 text-sm mt-3 max-w-2xl leading-relaxed">
          Personaliza colores, fuentes, bordes y logo. Los cambios afectan tu portal{" "}
          <span className="font-mono text-primary">/admin</span> y el link público que compartes con tus
          clientes. La landing LUMIA y el login conservan su identidad original.
        </p>
      </header>

      <BrandingEditor
        initial={branding}
        tenantName={me.tenant?.name ?? ""}
        canWrite={me.user.can_write}
      />
    </div>
  );
}

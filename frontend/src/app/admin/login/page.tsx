import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { API_BASE, AUTH_COOKIE } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

async function hasValidSession(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function AdminLoginPage() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (token && (await hasValidSession(token))) {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative z-10 texture-paper">
      <div className="w-full max-w-md">
        <div className="card-paper p-10">
          <Link href="/" className="text-primary flex justify-center mb-8">
            <Logo size={32} />
          </Link>

          <div className="mb-8 text-center">
            <div className="text-[10px] uppercase tracking-imperial text-accent-3 mb-3">Portal Admin</div>
            <h1 className="font-display italic text-3xl text-ink">Bienvenido de vuelta</h1>
            <p className="text-ink-2 text-sm mt-2 leading-relaxed">
              Ingresa con la cuenta del administrador de la barbería.
            </p>
          </div>

          <LoginForm />

          <hr className="hairline my-6" />

          <div className="text-xs text-ink-muted text-center">
            <span className="text-ink-2">Demo:</span>{" "}
            <span className="font-mono text-primary">admin@elnavajazo.test</span>{" "}
            <span className="text-ink-muted">/</span>{" "}
            <span className="font-mono text-primary">password</span>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-ink-muted">
          ¿Aún no tienes cuenta?{" "}
          <Link href="/precios" className="text-primary hover-spread inline-block">
            Cotiza un plan
          </Link>
        </div>
      </div>
    </div>
  );
}

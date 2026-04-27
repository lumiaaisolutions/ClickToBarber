import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const store = await cookies();
  if (store.get(AUTH_COOKIE)?.value) {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative z-10">
      <div className="w-full max-w-md">
        <div className="card-premium p-8">
          <div className="mb-8 text-center">
            <div className="text-xs uppercase tracking-[0.3em] text-accent mb-2">Portal Admin</div>
            <h1 className="font-display text-3xl">BarberPro</h1>
            <p className="text-text-2 text-sm mt-2">
              Ingresa con la cuenta del administrador de la barbería.
            </p>
          </div>

          <LoginForm />

          <div className="mt-6 pt-6 border-t border-border-subtle text-xs text-text-muted">
            <span className="text-text-2">Demo:</span>{" "}
            <span className="font-mono text-accent-2">admin@elnavajazo.test</span>{" "}
            <span className="text-text-muted">/</span>{" "}
            <span className="font-mono text-accent-2">password</span>
          </div>
        </div>
      </div>
    </div>
  );
}

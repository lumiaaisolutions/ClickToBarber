import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Scissors } from "lucide-react";
import { API_BASE, AUTH_COOKIE } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Entrar — ClickToBarber",
  description: "Entra a tu barbería en ClickToBarber.",
};

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

export default async function LoginPage() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;

  if (token && (await hasValidSession(token))) {
    redirect("/admin");
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-bg-canvas">
      {/* ─── Lado izquierdo — Banner con foto real de barbería ─── */}
      <aside className="relative hidden lg:flex lg:w-1/2 xl:w-[55%] overflow-hidden bg-ink">
        {/* Imagen de fondo — interior moderno de barbería */}
        <Image
          src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1600&q=80"
          alt="Interior de barbería"
          fill
          priority
          className="object-cover opacity-90"
          sizes="(min-width: 1280px) 55vw, 50vw"
        />

        {/* Gradient overlay para legibilidad del texto */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(196,146,42,0.82) 0%, rgba(15,12,8,0.52) 50%, rgba(139,90,43,0.65) 100%)",
          }}
        />

        {/* Contenido encima del banner */}
        <div className="relative z-10 w-full p-12 xl:p-16 flex flex-col text-white">
          {/* Header del banner — back link */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium opacity-90 hover:opacity-100 transition-opacity"
            >
              <ArrowLeft size={16} />
              <span>Inicio</span>
            </Link>
            <div className="inline-flex items-center gap-2 text-sm font-medium opacity-90">
              <Scissors size={14} />
              <span>ClickToBarber</span>
            </div>
          </div>

          {/* Centro del banner — mensaje principal */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h2 className="text-4xl xl:text-5xl leading-tight tracking-tight font-semibold">
              Bienvenido de vuelta.
            </h2>
            <p className="mt-5 text-base xl:text-lg opacity-90 leading-relaxed">
              Tu agenda, tus clientes y todo lo que pasa en tu barbería — en un solo lugar.
            </p>
          </div>

          {/* Footer del banner — stats limpios */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/20">
            <Stat label="Reservas" value="24/7" />
            <Stat label="Menos faltas" value="−87%" />
          </div>
        </div>
      </aside>

      {/* ─── Lado derecho — Form ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-10 lg:py-16">
        {/* Back link sólo en mobile (en desktop está en el banner) */}
        <Link
          href="/"
          className="lg:hidden self-start inline-flex items-center gap-2 text-sm font-medium text-ink-2 hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          <span>Inicio</span>
        </Link>

        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo size={36} />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display text-ink tracking-tight">
              Entra a tu barbería
            </h1>
            <p className="text-ink-2 text-sm mt-2.5">
              Usa tu correo y contraseña.
            </p>
          </div>

          {/* Form */}
          <LoginForm />

          {/* CTA register */}
          <div className="mt-8 text-center text-sm text-ink-muted">
            ¿No tienes cuenta?{" "}
            <Link href="/precios" className="text-primary font-semibold hover:underline">
              Empezar gratis
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl xl:text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-wider opacity-75 mt-1 font-medium">{label}</div>
    </div>
  );
}

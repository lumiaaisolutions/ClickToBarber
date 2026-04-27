"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Scissors,
  ShoppingBag,
  Megaphone,
  CircleDollarSign,
  Settings2,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin",            label: "Dashboard",     icon: LayoutDashboard },
  { href: "/admin/agenda",     label: "Agenda",        icon: CalendarDays },
  { href: "/admin/staff",      label: "Barberos",      icon: Users },
  { href: "/admin/services",   label: "Servicios",     icon: Scissors },
  { href: "/admin/pos",        label: "POS / Productos", icon: ShoppingBag, feature: "pos_inventory" as const },
  { href: "/admin/marketing",  label: "Marketing",     icon: Megaphone, feature: "marketing_retention" as const },
  { href: "/admin/finance",    label: "Finanzas",      icon: CircleDollarSign, feature: "finance_reports" as const },
  { href: "/admin/billing",    label: "Suscripción",   icon: Settings2 },
];

interface AdminSidebarProps {
  userName: string;
  userEmail: string;
  tenantSlug: string | null;
}

export function AdminSidebar({ userName, userEmail, tenantSlug }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    startTransition(() => {
      router.replace("/admin/login");
      router.refresh();
    });
  }

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[260px] flex-col border-r border-border-subtle bg-bg-base/60 backdrop-blur-md p-5 z-20">
      <Link href="/admin" className="flex items-center gap-3 mb-10 mt-1">
        <Logo size={36} />
        <div>
          <div className="font-display text-lg leading-none">BarberPro</div>
          <div className="text-[10px] uppercase tracking-wider text-text-muted mt-1">Portal Admin</div>
        </div>
      </Link>

      <nav className="flex-1 flex flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition group",
                active
                  ? "bg-accent/10 text-accent border border-accent/30"
                  : "text-text-2 hover:text-text hover:bg-bg-overlay/40 border border-transparent",
              )}
            >
              <Icon size={18} strokeWidth={1.6} />
              <span className="flex-1">{item.label}</span>
              {item.feature && (
                <span className="text-[9px] uppercase tracking-widest text-accent-2/80 opacity-70 group-hover:opacity-100">PRO</span>
              )}
            </Link>
          );
        })}
      </nav>

      {tenantSlug && (
        <div className="mt-6 p-4 rounded-xl border border-border-medium bg-gradient-to-b from-bordeaux/30 to-transparent">
          <div className="font-display text-sm">Vista Cliente</div>
          <p className="text-xs text-text-2 mt-1 mb-3">Mira tu barbería como la ven tus clientes.</p>
          <Link href={`/b/${tenantSlug}`} className="text-xs text-accent inline-flex items-center gap-1 hover:underline">
            Abrir vista pública <ExternalLink size={12} />
          </Link>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border-subtle">
        <div className="text-xs text-text-muted">
          {userName}
          <div className="text-[10px] text-accent-2/70 mt-0.5">{userEmail}</div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={pending}
          className="mt-3 w-full flex items-center gap-2 text-xs text-text-2 hover:text-danger transition disabled:opacity-50"
        >
          <LogOut size={14} strokeWidth={1.6} />
          <span>{pending ? "Cerrando sesión…" : "Cerrar sesión"}</span>
        </button>
      </div>
    </aside>
  );
}

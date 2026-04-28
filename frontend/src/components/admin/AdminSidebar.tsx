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
  Palette,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin",            label: "Dashboard",     icon: LayoutDashboard },
  { href: "/admin/agenda",     label: "Agenda",        icon: CalendarDays },
  { href: "/admin/staff",      label: "Personal",      icon: Users },
  { href: "/admin/services",   label: "Servicios",     icon: Scissors },
  { href: "/admin/pos",        label: "POS · Inventario", icon: ShoppingBag, feature: "pos_inventory" as const },
  { href: "/admin/marketing",  label: "Marketing",     icon: Megaphone, feature: "marketing_retention" as const },
  { href: "/admin/finance",    label: "Finanzas",      icon: CircleDollarSign, feature: "finance_reports" as const },
  { href: "/admin/identity",   label: "Identidad",     icon: Palette },
  { href: "/admin/billing",    label: "Suscripción",   icon: Settings2 },
];

interface AdminSidebarProps {
  userName: string;
  userEmail: string;
  userRole?: string;
  tenantName?: string;
  tenantSlug: string | null;
}

export function AdminSidebar({ userName, userEmail, userRole, tenantName, tenantSlug }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    startTransition(() => {
      router.replace("/login");
      router.refresh();
    });
  }

  const roleLabel = (() => {
    switch (userRole) {
      case "admin":            return "Administrador";
      case "platform_owner":   return "Owner LUMIA";
      case "manager":          return "Gerente";
      case "receptionist":     return "Recepcionista";
      case "barber":           return "Barbero";
      default:                 return "";
    }
  })();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[268px] flex-col border-r border-line-fine bg-bg-paper/85 backdrop-blur-md p-6 z-20">
      <Link href="/admin" className="flex items-center gap-3 mb-2 mt-1 text-primary">
        <Logo size={28} />
      </Link>

      {tenantName && (
        <div className="mt-2 mb-8">
          <div className="font-display italic text-ink text-xl leading-tight">{tenantName}</div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-ink-muted mt-2">
            Portal {roleLabel || "Admin"}
          </div>
        </div>
      )}

      <nav className="flex-1 flex flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                active
                  ? "bg-primary/8 text-primary border border-primary/24 font-medium"
                  : "text-ink-2 hover:text-primary hover:bg-bg-sage/40 border border-transparent",
              )}
            >
              <Icon size={17} strokeWidth={1.5} />
              <span className="flex-1 tracking-noble">{item.label}</span>
              {item.feature && (
                <span className="text-[9px] uppercase tracking-widest text-accent-3 opacity-70">PRO</span>
              )}
            </Link>
          );
        })}
      </nav>

      {tenantSlug && (
        <div className="mt-6 p-4 rounded-[14px] border border-line-medium bg-gradient-to-b from-bg-vellum to-transparent">
          <div className="font-display italic text-sm text-ink">Vista pública</div>
          <p className="text-xs text-ink-2 mt-1 mb-3">Como la ven tus clientes.</p>
          <Link href={`/b/${tenantSlug}`} target="_blank" className="text-xs text-primary inline-flex items-center gap-1.5 hover-spread">
            Abrir <ExternalLink size={12} />
          </Link>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-line-fine">
        <div className="text-xs text-ink">
          {userName}
          <div className="text-[10px] text-ink-muted mt-0.5 font-mono">{userEmail}</div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={pending}
          className="mt-3 w-full flex items-center gap-2 text-xs text-ink-2 hover:text-danger transition disabled:opacity-50"
        >
          <LogOut size={13} strokeWidth={1.6} />
          <span>{pending ? "Cerrando sesión…" : "Cerrar sesión"}</span>
        </button>
      </div>
    </aside>
  );
}

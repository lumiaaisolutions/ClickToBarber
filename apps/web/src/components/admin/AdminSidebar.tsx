"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
  Clock,
  ShieldCheck,
  ScrollText,
  Sparkles,
  UserPlus,
  CalendarSync,
  Globe,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Users2,
  Ticket as TicketIcon,
  Repeat,
  Activity,
  Star,
  Webhook,
  ImagePlus,
  Wrench,
  Crown,
  Gift,
  Lock,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./CommandPalette";
import { NotificationsBell } from "./NotificationsBell";
import { DarkModeToggle } from "@/components/DarkModeToggle";

/**
 * Cada item declara qué permisos exige.
 *  - `requireFinance`: solo visible si el user tiene can_see_finance.
 *  - `requireWrite`: solo visible si el user tiene can_write (admin/manager/owner).
 *  - `feature`: badge "PRO" — el FeatureGate del backend bloquea por plan.
 *
 * El backend ya bloquea con `role:` y `feature:` middleware; aquí solo
 * escondemos los entries para no mostrar links que devolverían 403.
 */
const NAV = [
  { href: "/admin",            label: "Dashboard",     icon: LayoutDashboard, tour: "dashboard" },
  { href: "/admin/agenda",     label: "Agenda",        icon: CalendarDays, tour: "agenda" },
  { href: "/admin/staff",      label: "Personal",      icon: Users },
  { href: "/admin/services",   label: "Servicios",     icon: Scissors, tour: "services" },
  { href: "/admin/business-hours", label: "Horarios",  icon: Clock, requireWrite: true },
  { href: "/admin/walkin",     label: "Fila virtual",  icon: Users2 },
  { href: "/admin/pos",        label: "POS · Inventario", icon: ShoppingBag, feature: "pos_inventory" as const, tour: "pos" },
  { href: "/admin/operations", label: "Operación",     icon: Wrench, requireWrite: true },
  { href: "/admin/pos/checkout", label: "POS · Cobrar", icon: ScrollText, feature: "pos_inventory" as const },
  { href: "/admin/cash-close", label: "Cierre de caja", icon: Wallet, requireWrite: true, requireFinance: true },
  { href: "/admin/marketing",  label: "Marketing",     icon: Megaphone, feature: "marketing_retention" as const },
  { href: "/admin/coupons",    label: "Cupones",       icon: TicketIcon, requireWrite: true },
  { href: "/admin/giftcards",  label: "Gift cards",    icon: Gift, requireWrite: true },
  { href: "/admin/memberships", label: "Membresías",   icon: Crown, requireWrite: true },
  { href: "/admin/loyalty",    label: "Loyalty",       icon: Sparkles, requireWrite: true },
  { href: "/admin/referrals",  label: "Referidos",     icon: UserPlus, requireWrite: true },
  { href: "/admin/recurrences", label: "Recurrentes",  icon: Repeat, requireWrite: true },
  { href: "/admin/ratings",    label: "Reseñas",       icon: Star, requireWrite: true },
  { href: "/admin/gallery",    label: "Galería",       icon: ImagePlus, requireWrite: true },
  { href: "/admin/insights",   label: "Insights",      icon: Activity },
  { href: "/admin/finance",    label: "Finanzas",      icon: CircleDollarSign, feature: "finance_reports" as const, requireFinance: true },
  { href: "/admin/identity",   label: "Identidad",     icon: Palette, requireWrite: true, tour: "identity" },
  { href: "/admin/calendar",   label: "Calendario",    icon: CalendarSync },
  { href: "/admin/domains",    label: "Dominios",      icon: Globe, requireWrite: true },
  { href: "/admin/platform",   label: "API & Webhooks", icon: Webhook, requireWrite: true },
  { href: "/admin/security/2fa", label: "Seguridad",   icon: ShieldCheck },
  { href: "/admin/security/policy", label: "Política", icon: Lock, requireWrite: true },
  { href: "/admin/audit",      label: "Bitácora",      icon: ScrollText, requireWrite: true },
  { href: "/admin/billing",    label: "Suscripción",   icon: Settings2, requireWrite: true },
] as const;

interface AdminSidebarProps {
  userName: string;
  userEmail: string;
  userRole?: string;
  canWrite?: boolean;
  canSeeFinance?: boolean;
  tenantName?: string;
  tenantSlug: string | null;
}

export function AdminSidebar(props: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cierra el drawer al navegar.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Bloquea scroll del body cuando el drawer está abierto.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  return (
    <>
      <CommandPalette />

      {/* Topbar móvil/tablet — visible <lg */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 px-4 flex items-center justify-between border-b border-line-fine bg-bg-canvas/85 backdrop-blur-md gap-2">
        <Link href="/admin" className="flex items-center gap-2 text-primary min-w-0 flex-1">
          <Logo size={22} />
          {props.tenantName && (
            <span className="font-display italic text-ink text-base leading-none truncate max-w-[160px]">
              {props.tenantName}
            </span>
          )}
        </Link>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <button
            type="button"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-[10px] border border-line-medium text-ink-2 hover:text-primary hover:border-primary/40 transition"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Backdrop drawer móvil */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
        />
      )}

      {/* Drawer móvil */}
      <div
        className={cn(
          "lg:hidden fixed top-0 bottom-0 left-0 z-50 w-[280px] max-w-[85vw] border-r border-line-fine bg-bg-paper shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={!mobileOpen}
      >
        <SidebarContents {...props} onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* Sidebar desktop — visible lg+ */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[268px] flex-col border-r border-line-fine bg-bg-paper/85 backdrop-blur-md z-20">
        <SidebarContents {...props} />
      </aside>

      {/* Topbar derecho desktop — bell + dark mode flotantes */}
      <div className="hidden lg:flex fixed top-4 right-4 z-30 items-center gap-2">
        <NotificationsBell />
        <DarkModeToggle />
      </div>
    </>
  );
}

function SidebarContents({
  userName,
  userEmail,
  userRole,
  canWrite = false,
  canSeeFinance = false,
  tenantName,
  tenantSlug,
  onNavigate,
}: AdminSidebarProps & { onNavigate?: () => void }) {
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
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <Link href="/admin" className="flex items-center gap-3 mb-2 mt-1 text-primary" onClick={onNavigate}>
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
        {NAV.filter((item) => {
          if ("requireFinance" in item && item.requireFinance && !canSeeFinance) return false;
          if ("requireWrite" in item && item.requireWrite && !canWrite) return false;
          return true;
        }).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              data-tour={"tour" in item ? item.tour : undefined}
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
        <div className="text-xs text-ink truncate">
          {userName}
          <div className="text-[10px] text-ink-muted mt-0.5 font-mono truncate">{userEmail}</div>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("lumia:tour:open"))}
          className="mt-3 w-full flex items-center gap-2 text-xs text-ink-2 hover:text-primary transition"
        >
          <Sparkles size={13} strokeWidth={1.6} />
          <span>Ver tour de bienvenida</span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          disabled={pending}
          className="mt-2 w-full flex items-center gap-2 text-xs text-ink-2 hover:text-danger transition disabled:opacity-50"
        >
          <LogOut size={13} strokeWidth={1.6} />
          <span>{pending ? "Cerrando sesión…" : "Cerrar sesión"}</span>
        </button>
      </div>
    </div>
  );
}

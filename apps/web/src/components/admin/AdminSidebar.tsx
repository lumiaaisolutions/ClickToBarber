"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
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
  ScrollText,
  Sparkles,
  UserPlus,
  CalendarSync,
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
  ChevronDown,
  Building2,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./CommandPalette";
import { NotificationsBell } from "./NotificationsBell";
import { DarkModeToggle } from "@/components/DarkModeToggle";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tour?: string;
  feature?: "pos_inventory" | "marketing_retention" | "finance_reports";
  requireWrite?: boolean;
  requireFinance?: boolean;
};

type NavGroup = {
  id: string;
  label: string | null; // null = grupo siempre abierto, sin header
  items: NavItem[];
};

/**
 * Sidebar agrupada por contexto de uso para reducir saturación.
 * Items que requerían permisos antes se filtran a la entrada del nav.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    id: "inicio",
    label: null,
    items: [
      { href: "/admin",         label: "Dashboard", icon: LayoutDashboard, tour: "dashboard" },
      { href: "/admin/agenda",  label: "Agenda",    icon: CalendarDays, tour: "agenda" },
    ],
  },
  {
    id: "negocio",
    label: "Tu negocio",
    items: [
      { href: "/admin/staff",          label: "Personal",      icon: Users },
      { href: "/admin/services",       label: "Servicios",     icon: Scissors, tour: "services" },
      { href: "/admin/business-hours", label: "Horarios",      icon: Clock, requireWrite: true },
      { href: "/admin/walkin",         label: "Fila virtual",  icon: Users2 },
    ],
  },
  {
    id: "ventas",
    label: "Ventas y caja",
    items: [
      { href: "/admin/pos",          label: "Productos",      icon: ShoppingBag, feature: "pos_inventory", tour: "pos" },
      { href: "/admin/pos/checkout", label: "Cobrar",         icon: ScrollText, feature: "pos_inventory" },
      { href: "/admin/cash-close",   label: "Cierre de caja", icon: Wallet, requireWrite: true, requireFinance: true },
      { href: "/admin/finance",      label: "Ingresos",       icon: CircleDollarSign, feature: "finance_reports", requireFinance: true },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    items: [
      { href: "/admin/marketing",   label: "Campañas",          icon: Megaphone, feature: "marketing_retention" },
      { href: "/admin/coupons",     label: "Cupones",           icon: TicketIcon, requireWrite: true },
      { href: "/admin/giftcards",   label: "Tarjetas regalo",   icon: Gift, requireWrite: true },
      { href: "/admin/memberships", label: "Membresías",        icon: Crown, requireWrite: true },
      { href: "/admin/loyalty",     label: "Lealtad",           icon: Sparkles, requireWrite: true },
      { href: "/admin/referrals",   label: "Referidos",         icon: UserPlus, requireWrite: true },
      { href: "/admin/recurrences", label: "Citas que se repiten", icon: Repeat, requireWrite: true },
    ],
  },
  {
    id: "reputacion",
    label: "Reputación",
    items: [
      { href: "/admin/ratings",  label: "Reseñas",      icon: Star, requireWrite: true },
      { href: "/admin/gallery",  label: "Galería",      icon: ImagePlus, requireWrite: true },
      { href: "/admin/insights", label: "Estadísticas", icon: Activity },
    ],
  },
  {
    id: "config",
    label: "Configuración",
    items: [
      { href: "/admin/identity",        label: "Tu marca",         icon: Palette, requireWrite: true, tour: "identity" },
      { href: "/admin/calendar",        label: "Google Calendar",  icon: CalendarSync },
      { href: "/admin/security/policy", label: "Seguridad",        icon: Lock, requireWrite: true },
      { href: "/admin/billing",         label: "Mi plan",          icon: Settings2, requireWrite: true },
    ],
  },
];

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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

      {/* Topbar móvil/tablet */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 px-4 flex items-center justify-between border-b border-line-fine bg-bg-canvas/85 backdrop-blur-md gap-2">
        <Link href="/admin" className="flex items-center text-ink min-w-0 flex-1" onClick={() => setMobileOpen(false)}>
          <Logo size={26} />
          {props.tenantName && (
            <span className="font-display text-ink text-base leading-none truncate max-w-[160px] ml-2 font-bold tracking-tight">
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
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-line-medium text-ink-2 hover:text-primary hover:border-primary/40 transition"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
        />
      )}

      <div
        className={cn(
          "lg:hidden fixed top-0 bottom-0 left-0 z-50 w-[300px] max-w-[88vw] border-r border-line-fine bg-bg-paper shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={!mobileOpen}
      >
        <SidebarContents {...props} onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[280px] flex-col border-r border-line-fine bg-bg-paper z-20">
        <SidebarContents {...props} />
      </aside>

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

  // Filtra grupos por permisos (esconde items que no aplican)
  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (item.requireFinance && !canSeeFinance) return false;
        if (item.requireWrite && !canWrite) return false;
        return true;
      }),
    })).filter((g) => g.items.length > 0);
  }, [canSeeFinance, canWrite]);

  // Detecta en qué grupo está la ruta activa para auto-expandirlo.
  const activeGroupId = useMemo(() => {
    if (!pathname) return null;
    for (const g of visibleGroups) {
      const hit = g.items.find(
        (i) => pathname === i.href || (i.href !== "/admin" && pathname.startsWith(i.href)),
      );
      if (hit) return g.id;
    }
    return null;
  }, [pathname, visibleGroups]);

  // Estado de expansión por grupo. Persiste en localStorage. Default: solo
  // el grupo activo + "inicio" (sin label) abiertos.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ctb:sidebar-groups");
      if (raw) {
        setOpenGroups(JSON.parse(raw));
        return;
      }
    } catch {}
    // Default: inicio + grupo activo abiertos, resto cerrados.
    const next: Record<string, boolean> = {};
    for (const g of NAV_GROUPS) {
      next[g.id] = g.label === null || g.id === activeGroupId;
    }
    setOpenGroups(next);
  }, [activeGroupId]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("ctb:sidebar-groups", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    startTransition(() => {
      router.replace("/login");
      router.refresh();
    });
  }

  const roleLabel = (() => {
    switch (userRole) {
      case "admin":          return "Administrador";
      case "platform_owner": return "Owner ClickToBarber";
      case "manager":        return "Gerente";
      case "receptionist":   return "Recepcionista";
      case "barber":         return "Barbero";
      default:               return "";
    }
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Header pinneado */}
      <div className="shrink-0 px-5 pt-5 pb-3 border-b border-line-fine">
        <Link href="/admin" className="flex items-center text-ink" onClick={onNavigate}>
          <Logo size={30} />
        </Link>

        {tenantName && (
          <div className="mt-4">
            <div className="font-display text-ink text-lg leading-tight font-bold tracking-tight truncate">
              {tenantName}
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-1.5 font-semibold">
              {roleLabel || "Admin"}
            </div>
          </div>
        )}
      </div>

      {/* Nav scrollable — data-lenis-prevent destraba el wheel local */}
      <nav
        data-lenis-prevent
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-1"
      >
        {visibleGroups.map((g) => (
          <NavGroupBlock
            key={g.id}
            group={g}
            isOpen={openGroups[g.id] ?? g.label === null}
            onToggle={() => toggleGroup(g.id)}
            pathname={pathname ?? ""}
            onNavigate={onNavigate}
          />
        ))}

        {/* ── LUMIA Platform — solo platform_owner ── */}
        {userRole === "platform_owner" && (
          <div className="mt-2 pt-2 border-t border-line-fine">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70">
              LUMIA Platform
            </div>
            <ul className="space-y-0.5 mt-1">
              {[
                { href: "/admin/superadmin",         label: "Todos los negocios", icon: Building2 },
                { href: "/admin/superadmin/users",   label: "Usuarios globales",  icon: Users },
              ].map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== "/admin" && (pathname ?? "").startsWith(href));
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all",
                        active
                          ? "bg-primary/10 text-primary font-semibold shadow-sm"
                          : "text-ink-2 hover:text-ink hover:bg-bg-vellum",
                      )}
                    >
                      <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                      <span>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* ── Ayuda ── */}
        <div className="mt-2 pt-2 border-t border-line-fine">
          <ul>
            <li>
              <Link
                href="/admin/help"
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all",
                  (pathname ?? "").startsWith("/admin/help")
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-ink-2 hover:text-ink hover:bg-bg-vellum",
                )}
              >
                <HelpCircle size={16} strokeWidth={1.8} />
                <span>Ayuda</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Footer pinneado */}
      <div className="shrink-0 px-4 pt-3 pb-4 border-t border-line-fine bg-bg-paper">
        {/* CTA tonal — ver sitio público */}
        {tenantSlug && (
          <Link
            href={`/b/${tenantSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group mb-3 flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-primary/8 hover:bg-primary/12 border border-primary/15 hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
                <ExternalLink size={14} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-ink leading-tight">Tu sitio público</div>
                <div className="text-[11px] text-ink-2 truncate group-hover:text-primary transition-colors">
                  {tenantSlug && `clicktobarber.com/b/${tenantSlug}`}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* User row con avatar */}
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
          <UserAvatar name={userName} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-ink truncate leading-tight">{userName}</div>
            <div className="text-[11px] text-ink-muted truncate leading-tight mt-0.5">
              {roleLabel || userEmail}
            </div>
          </div>
        </div>

        {/* Botones inline */}
        <div className="flex items-center gap-1 mt-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("ctb:tour:open"))}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold text-ink-2 hover:text-primary hover:bg-bg-vellum transition"
          >
            <Sparkles size={12} strokeWidth={2} />
            <span>Tour</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={pending}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold text-ink-2 hover:text-danger hover:bg-danger/8 transition disabled:opacity-50"
          >
            <LogOut size={12} strokeWidth={2} />
            <span>{pending ? "…" : "Salir"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0"
      style={{ background: "var(--cb-gradient)" }}
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}

function NavGroupBlock({
  group,
  isOpen,
  onToggle,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
  onNavigate?: () => void;
}) {
  // Si el grupo NO tiene label (ej. inicio), siempre se renderiza abierto.
  const showHeader = group.label !== null;
  const actuallyOpen = !showHeader || isOpen;

  return (
    <div>
      {showHeader && (
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors",
            "text-ink-muted hover:text-ink-2 hover:bg-bg-vellum",
          )}
        >
          <span>{group.label}</span>
          <ChevronDown
            size={14}
            strokeWidth={2}
            className={cn("transition-transform duration-200", isOpen ? "rotate-0" : "-rotate-90")}
          />
        </button>
      )}

      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          actuallyOpen ? "opacity-100" : "opacity-0",
        )}
        style={{
          maxHeight: actuallyOpen ? `${group.items.length * 48 + 8}px` : "0",
        }}
      >
        <ul className={cn("space-y-0.5", showHeader && "mt-1 mb-2")}>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  data-tour={item.tour}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                    active
                      ? "bg-primary/10 text-primary font-semibold shadow-sm"
                      : "text-ink-2 hover:text-ink hover:bg-bg-vellum",
                  )}
                >
                  <Icon size={17} strokeWidth={1.8} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.feature && (
                    <span
                      className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md text-white"
                      style={{ background: "var(--cb-gradient)" }}
                    >
                      Pro
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

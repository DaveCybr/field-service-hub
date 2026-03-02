// ============================================
// FILE: src/components/layout/DashboardLayout.tsx
// Enterprise-grade layout — collapsible sidebar
// ============================================
import { ReactNode, useState, createContext, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Wrench,
  Users,
  UserCircle,
  Package,
  QrCode,
  FileText,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  Shield,
  ScrollText,
  CreditCard,
  BarChart2,
  Navigation,
  Bell,
  ChevronDown,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationsDropdown from "./NotificationsDropdown";
import { supabase } from "@/integrations/supabase/client";

// ── Context ─────────────────────────────────────────────────────────────────
const SidebarContext = createContext<{ collapsed: boolean }>({
  collapsed: false,
});
export const useSidebar = () => useContext(SidebarContext);

// ── Types ────────────────────────────────────────────────────────────────────
interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

// ── Navigation config ────────────────────────────────────────────────────────
const adminNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Manajemen Pekerjaan", href: "/jobs", icon: Wrench },
  { name: "Faktur", href: "/invoices", icon: FileText },
  { name: "Teknisi", href: "/technicians", icon: Users },
  { name: "Tracking Teknisi", href: "/technician-tracking", icon: Navigation },
  { name: "Pelanggan", href: "/customers", icon: UserCircle },
  { name: "Unit", href: "/units", icon: QrCode },
  { name: "Inventaris", href: "/inventory", icon: Package },
  { name: "Laporan", href: "/reports", icon: BarChart2 },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

const technicianNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Pekerjaan", href: "/technician/jobs", icon: Wrench },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

const cashierNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Pembayaran", href: "/jobs", icon: CreditCard },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

const superadminExtras: NavItem[] = [
  { name: "Manajemen User", href: "/users", icon: Shield },
  { name: "Audit Log", href: "/audit-logs", icon: ScrollText },
];

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  manager: "Manajer",
  technician: "Teknisi",
  cashier: "Kasir",
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

// ── NavItem component ────────────────────────────────────────────────────────
function NavLink({
  item,
  collapsed,
  isActive,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  const link = (
    <Link
      to={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 relative",
        isActive
          ? "bg-white/10 text-white"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
        collapsed && "justify-center px-2",
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-r-full" />
      )}
      <item.icon
        className={cn(
          "shrink-0 transition-all",
          isActive
            ? "text-blue-400"
            : "text-slate-500 group-hover:text-slate-300",
          collapsed ? "h-5 w-5" : "h-4 w-4",
        )}
      />
      {!collapsed && <span className="truncate flex-1">{item.name}</span>}
      {!collapsed && item.badge && item.badge > 0 && (
        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">
          {item.badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

// ── Main Layout ──────────────────────────────────────────────────────────────
export default function DashboardLayout({
  children,
  className,
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { employee, isSuperadmin, isAdmin, userRole } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useRealtimeNotifications();
  const location = useLocation();

  const getNav = () => {
    if (!userRole) return [];
    if (isSuperadmin) return [...adminNavigation, ...superadminExtras];
    if (isAdmin || userRole === "manager") return adminNavigation;
    if (userRole === "cashier") return cashierNavigation;
    return technicianNavigation;
  };

  const navigation = getNav();

  // Group navigation
  const mainNav = navigation.filter(
    (n) => !["Pengaturan", "Manajemen User", "Audit Log"].includes(n.name),
  );
  const bottomNav = navigation.filter((n) =>
    ["Pengaturan", "Manajemen User", "Audit Log"].includes(n.name),
  );

  const handleSignOut = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    supabase.auth.signOut().catch(() => {});
    setTimeout(() => {
      window.location.href = "/auth";
    }, 100);
  };

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + "/");

  const sidebarWidth = collapsed ? "72px" : "240px";

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <TooltipProvider delayDuration={0}>
        <div
          className={cn("min-h-screen bg-[#f5f6fa]", className)}
          style={{ fontFamily: "'Inter','DM Sans',system-ui,sans-serif" }}
        >
          {/* ── Mobile overlay ── */}
          {mobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40 lg:hidden backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
          )}

          {/* ── Sidebar ── */}
          <aside
            style={{
              width: mobileOpen ? "240px" : collapsed ? "72px" : "240px",
              transition: "width 0.2s ease",
            }}
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex flex-col",
              "bg-[#0f172a]",
              // Mobile: hidden by default
              mobileOpen
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0",
              "transition-all duration-200",
            )}
          >
            {/* Logo area */}
            <div className="flex h-16 items-center justify-between px-4 border-b border-white/5 shrink-0">
              <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500">
                  <Wrench className="h-4 w-4 text-white" />
                </div>
                {!collapsed && (
                  <span className="text-sm font-bold text-white tracking-wide truncate">
                    REKAMTEKNIK
                  </span>
                )}
              </Link>
              {/* Collapse toggle — desktop only */}
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
              >
                <ChevronLeft
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    collapsed && "rotate-180",
                  )}
                />
              </button>
            </div>

            {/* Main navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
              {/* Section label */}
              {!collapsed && (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                  Menu
                </p>
              )}
              {mainNav.map((item) => (
                <NavLink
                  key={item.name}
                  item={item}
                  collapsed={collapsed}
                  isActive={isActive(item.href)}
                />
              ))}

              {/* Divider */}
              {bottomNav.length > 0 && (
                <div className="my-3 border-t border-white/5" />
              )}

              {!collapsed && bottomNav.length > 0 && (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                  Sistem
                </p>
              )}
              {bottomNav.map((item) => (
                <NavLink
                  key={item.name}
                  item={item}
                  collapsed={collapsed}
                  isActive={isActive(item.href)}
                />
              ))}
            </nav>

            {/* User profile */}
            <div className="shrink-0 border-t border-white/5 p-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/5",
                      collapsed && "justify-center",
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={employee?.avatar_url || undefined} />
                      <AvatarFallback className="bg-blue-500 text-white text-xs font-bold">
                        {employee?.name ? getInitials(employee.name) : "U"}
                      </AvatarFallback>
                    </Avatar>
                    {!collapsed && (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate leading-tight">
                          {employee?.name || "User"}
                        </p>
                        <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">
                          {ROLE_LABELS[employee?.role || ""] ||
                            employee?.role ||
                            ""}
                        </p>
                      </div>
                    )}
                    {!collapsed && (
                      <ChevronDown className="h-3 w-3 text-slate-600 shrink-0" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" side="top" align="start">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-semibold">{employee?.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {employee?.email}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </aside>

          {/* ── Main content area ── */}
          <div
            style={{
              marginLeft: collapsed ? "72px" : "240px",
              transition: "margin-left 0.2s ease",
            }}
            className="flex flex-col min-h-screen lg:ml-auto"
          >
            {/* ── Topbar ── */}
            <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Breadcrumb / page title area — children can override via portal if needed */}
              <div className="flex-1" />

              {/* Right actions */}
              <div className="flex items-center gap-1">
                {/* Notifications */}
                <NotificationsDropdown
                  notifications={notifications}
                  unreadCount={unreadCount}
                  onMarkAsRead={markAsRead}
                  onMarkAllAsRead={markAllAsRead}
                  onClear={clearNotifications}
                />

                {/* User avatar (topbar) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 transition-colors">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={employee?.avatar_url || undefined} />
                        <AvatarFallback className="bg-blue-500 text-white text-xs font-bold">
                          {employee?.name ? getInitials(employee.name) : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                        {employee?.name}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-sm font-semibold">{employee?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {employee?.email}
                      </p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Keluar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* ── Page content ── */}
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

// ── Page header helper component ─────────────────────────────────────────────
// Pakai ini di setiap halaman untuk konsistensi header
export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}) {
  return (
    <div className="mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3">
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-slate-300 text-xs">/</span>}
              {b.href ? (
                <Link
                  to={b.href}
                  className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {b.label}
                </Link>
              ) : (
                <span className="text-xs text-slate-400">{b.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

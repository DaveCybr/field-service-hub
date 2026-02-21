import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { Button } from "@/components/ui/button";
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
  X,
  ChevronRight,
  Shield,
  ScrollText,
  CreditCard,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationsDropdown from "./NotificationsDropdown";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

const adminNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Jobs Management", href: "/jobs", icon: Wrench },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Technicians", href: "/technicians", icon: Users },
  { name: "Customers", href: "/customers", icon: UserCircle },
  { name: "Units", href: "/units", icon: QrCode },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Reports", href: "/reports", icon: BarChart2 },
  { name: "Settings", href: "/settings", icon: Settings },
];

const technicianNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Pekerjaan", href: "/technician/jobs", icon: Wrench },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

const cashierNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Pembayaran", href: "/jobs", icon: CreditCard },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

const superadminExtras = [
  { name: "User Management", href: "/users", icon: Shield },
  { name: "Audit Logs", href: "/audit-logs", icon: ScrollText },
];

// Label Indonesia untuk nama navigasi admin
const navLabelID: Record<string, string> = {
  Dashboard: "Dashboard",
  "Jobs Management": "Manajemen Pekerjaan",
  Invoices: "Faktur",
  Technicians: "Teknisi",
  Customers: "Pelanggan",
  Units: "Unit",
  Inventory: "Inventaris",
  Reports: "Laporan",
  Settings: "Pengaturan",
  "User Management": "Manajemen User",
  "Audit Logs": "Audit Log",
};

export default function DashboardLayout({
  children,
  className,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { employee, isSuperadmin, isAdmin, userRole, signOut, user } =
    useAuth();
  const { log: auditLog } = useAuditLog();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useRealtimeNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const getNavigationByRole = () => {
    if (isSuperadmin) return [...adminNavigation, ...superadminExtras];
    if (isAdmin || userRole === "manager") return adminNavigation;
    if (userRole === "cashier") return cashierNavigation;
    if (userRole === "technician") return technicianNavigation;
    return technicianNavigation;
  };

  const navigation = getNavigationByRole();

  const handleSignOut = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}

    supabase.auth.signOut().catch(() => {});

    setTimeout(() => {
      window.location.href = "/auth";
    }, 100);
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Label yang ditampilkan — pakai terjemahan Indonesia jika ada
  const getLabel = (name: string) => navLabelID[name] || name;

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-sidebar-foreground">
              REKAMTEKNIK
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-sidebar-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              location.pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{getLabel(item.name)}</span>
                {isActive && (
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={employee?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {employee?.name ? getInitials(employee.name) : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {employee?.name || "User"}
              </p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">
                {employee?.role === "superadmin"
                  ? "Superadmin"
                  : employee?.role === "admin"
                    ? "Admin"
                    : employee?.role === "manager"
                      ? "Manajer"
                      : employee?.role === "technician"
                        ? "Teknisi"
                        : employee?.role === "cashier"
                          ? "Kasir"
                          : employee?.role || "Anggota"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1" />

          <LanguageSwitcher />

          <NotificationsDropdown
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onClear={clearNotifications}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={employee?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {employee?.name ? getInitials(employee.name) : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {employee?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {employee?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Keluar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

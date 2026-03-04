// ============================================
// FILE: src/pages/Dashboard.tsx
// FIX Bug 4: completedJobsToday pakai updated_at bukan actual_checkout_at
//            (kolom actual_checkout_at sudah dihapus saat cleanup)
// ============================================
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatCurrency } from "@/lib/utils/currency";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import {
  DollarSign,
  TrendingUp,
  Wrench,
  Users,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Package,
  ArrowRight,
  Activity,
} from "lucide-react";

interface DashboardStats {
  todayRevenue: number;
  monthlyRevenue: number;
  totalCustomers: number;
  activeJobs: number;
  pendingJobs: number;
  completedJobsToday: number;
}
interface RecentInvoice {
  id: string;
  invoice_number: string;
  customer: { name: string };
  grand_total: number;
  payment_status: string;
}
interface PendingJob {
  id: string;
  title: string;
  priority: string;
  invoice: { invoice_number: string; customer: { name: string } };
}
interface StockAlert {
  id: string;
  product: { name: string; stock: number; min_stock_threshold: number };
}
interface TechnicianStatus {
  id: string;
  name: string;
  status: string;
  active_jobs_count: number;
}

const PAYMENT_STATUS: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  paid: { label: "Lunas", color: "#16a34a", bg: "#dcfce7" },
  partial: { label: "Sebagian", color: "#d97706", bg: "#fef9c3" },
  unpaid: { label: "Belum Bayar", color: "#6b7280", bg: "#f3f4f6" },
  overdue: { label: "Jatuh Tempo", color: "#dc2626", bg: "#fee2e2" },
};

const PRIORITY: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: "Mendesak", color: "#dc2626", bg: "#fee2e2" },
  high: { label: "Tinggi", color: "#ea580c", bg: "#ffedd5" },
  normal: { label: "Normal", color: "#2563eb", bg: "#dbeafe" },
  low: { label: "Rendah", color: "#6b7280", bg: "#f3f4f6" },
};

function StatusBadge({
  config,
}: {
  config: { label: string; color: string; bg: string };
}) {
  return (
    <span
      style={{
        background: config.bg,
        color: config.color,
        fontSize: "11px",
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: "20px",
        whiteSpace: "nowrap",
      }}
    >
      {config.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        padding: "20px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <p
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </p>
        <div
          style={{ background: iconBg, borderRadius: "8px", padding: "8px" }}
        >
          <Icon style={{ width: "16px", height: "16px", color: iconColor }} />
        </div>
      </div>
      <p
        style={{
          fontSize: "26px",
          fontWeight: 700,
          color: "#111827",
          lineHeight: 1,
          margin: "0 0 6px",
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>{sub}</p>
      )}
    </div>
  );
}

function SectionCard({
  title,
  badge,
  onViewAll,
  children,
}: {
  title: string;
  badge?: number;
  onViewAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid #f3f4f6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>
            {title}
          </span>
          {badge !== undefined && badge > 0 && (
            <span
              style={{
                background: "#fee2e2",
                color: "#dc2626",
                fontSize: "11px",
                fontWeight: 700,
                padding: "1px 7px",
                borderRadius: "20px",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              fontWeight: 500,
              color: "#2563eb",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            Lihat Semua <ArrowRight style={{ width: "12px", height: "12px" }} />
          </button>
        )}
      </div>
      <div style={{ padding: "4px 0" }}>{children}</div>
    </div>
  );
}

function RowItem({
  onClick,
  children,
  warning,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 20px",
        cursor: onClick ? "pointer" : "default",
        borderLeft: warning ? "3px solid #fbbf24" : "3px solid transparent",
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) =>
        onClick && (e.currentTarget.style.background = "#f9fafb")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </div>
  );
}

function Skeleton({ w = "100%", h = "16px" }: { w?: string; h?: string }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: "6px",
        background:
          "linear-gradient(90deg,#f3f4f6 25%,#e9ebee 50%,#f3f4f6 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
      }}
    />
  );
}

function EmptyState({
  icon,
  message,
  positive,
}: {
  icon: React.ReactNode;
  message: string;
  positive?: boolean;
}) {
  return (
    <div style={{ padding: "32px 20px", textAlign: "center" }}>
      <div
        style={{
          marginBottom: "8px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <p
        style={{
          fontSize: "13px",
          color: positive ? "#16a34a" : "#9ca3af",
          fontWeight: 500,
          margin: 0,
        }}
      >
        {message}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalCustomers: 0,
    activeJobs: 0,
    pendingJobs: 0,
    completedJobsToday: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchRecentInvoices(),
      fetchPendingJobs(),
      fetchStockAlerts(),
      fetchTechnicians(),
    ]);
    setLoading(false);
  };

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todayInv,
      monthInv,
      custCount,
      activeCount,
      pendingCount,
      completedCount,
    ] = await Promise.all([
      supabase
        .from("invoices")
        .select("grand_total")
        .gte("created_at", today.toISOString())
        .in("payment_status", ["paid", "partial"]),
      supabase
        .from("invoices")
        .select("grand_total")
        .gte("created_at", startOfMonth.toISOString())
        .in("payment_status", ["paid", "partial"]),
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase
        .from("invoice_services")
        .select("*", { count: "exact", head: true })
        .in("status", ["assigned", "in_progress"]),
      supabase
        .from("invoice_services")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      // ✅ FIX Bug 4: Ganti actual_checkout_at → updated_at
      // actual_checkout_at sudah dihapus dari tabel invoice_services
      supabase
        .from("invoice_services")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("updated_at", today.toISOString()),
    ]);

    setStats({
      todayRevenue:
        todayInv.data?.reduce((s, i) => s + (i.grand_total || 0), 0) || 0,
      monthlyRevenue:
        monthInv.data?.reduce((s, i) => s + (i.grand_total || 0), 0) || 0,
      totalCustomers: custCount.count || 0,
      activeJobs: activeCount.count || 0,
      pendingJobs: pendingCount.count || 0,
      completedJobsToday: completedCount.count || 0,
    });
  };

  const fetchRecentInvoices = async () => {
    const { data } = await supabase
      .from("invoices")
      .select(
        "id,invoice_number,grand_total,payment_status,customer:customers(name)",
      )
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentInvoices(data || []);
  };

  const fetchPendingJobs = async () => {
    const { data } = await supabase
      .from("invoice_services")
      .select(
        "id,title,priority,invoice:invoices!inner(invoice_number,customer:customers(name))",
      )
      .eq("status", "pending")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(5);
    setPendingJobs(data || []);
  };

  const fetchStockAlerts = async () => {
    const { data } = await supabase
      .from("stock_alerts")
      .select("id,product:products!inner(name,stock,min_stock_threshold)")
      .eq("status", "active")
      .limit(5);
    setStockAlerts(data || []);
  };

  const fetchTechnicians = async () => {
    const { data } = await supabase
      .from("employees")
      .select(
        "id,name,status,active_jobs:invoice_services!assigned_technician_id(count)",
      )
      .eq("role", "technician")
      .order("name");
    setTechnicians(
      (data || []).map((t: any) => ({
        ...t,
        active_jobs_count: t.active_jobs?.[0]?.count || 0,
      })),
    );
  };

  const today = new Date();

  return (
    <DashboardLayout>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .dash-fade { animation: fadeIn 0.25s ease; }
      `}</style>

      <div
        className="dash-fade"
        style={{ display: "flex", flexDirection: "column", gap: "24px" }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 4px",
                letterSpacing: "-0.01em",
              }}
            >
              Selamat datang, {employee?.name?.split(" ")[0]} 👋
            </h1>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
              {format(today, "EEEE, d MMMM yyyy", { locale: localeId })} ·
              Ringkasan aktivitas bisnis hari ini
            </p>
          </div>
          <button
            onClick={() => navigate("/invoices/new")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "9px",
              padding: "9px 18px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(37,99,235,0.3)",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#2563eb")}
          >
            <Plus style={{ width: "15px", height: "15px" }} />
            Faktur Baru
          </button>
        </div>

        {/* Stats */}
        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "16px",
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  background: "white",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  padding: "20px",
                }}
              >
                <div style={{ marginBottom: "16px" }}>
                  <Skeleton w="50%" h="12px" />
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <Skeleton w="60%" h="28px" />
                </div>
                <Skeleton w="40%" h="12px" />
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "16px",
            }}
          >
            <StatCard
              label="Pendapatan Hari Ini"
              value={formatCurrency(stats.todayRevenue)}
              icon={DollarSign}
              iconColor="#16a34a"
              iconBg="#dcfce7"
            />
            <StatCard
              label="Pendapatan Bulan Ini"
              value={formatCurrency(stats.monthlyRevenue)}
              icon={TrendingUp}
              iconColor="#2563eb"
              iconBg="#dbeafe"
              sub={`Periode ${format(today, "MMMM yyyy", { locale: localeId })}`}
            />
            <StatCard
              label="Pekerjaan Aktif"
              value={String(stats.activeJobs)}
              icon={Wrench}
              iconColor="#7c3aed"
              iconBg="#ede9fe"
              sub={`${stats.pendingJobs} menunggu · ${stats.completedJobsToday} selesai hari ini`}
            />
            <StatCard
              label="Total Pelanggan"
              value={String(stats.totalCustomers)}
              icon={Users}
              iconColor="#d97706"
              iconBg="#fef9c3"
            />
          </div>
        )}

        {/* Two column */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <SectionCard
            title="Faktur Terbaru"
            onViewAll={() => navigate("/invoices")}
          >
            {loading ? (
              <div
                style={{
                  padding: "12px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        flex: 1,
                      }}
                    >
                      <Skeleton w="55%" h="13px" />
                      <Skeleton w="35%" h="11px" />
                    </div>
                    <Skeleton w="20%" h="22px" />
                  </div>
                ))}
              </div>
            ) : recentInvoices.length === 0 ? (
              <EmptyState
                icon={
                  <DollarSign
                    style={{ width: "24px", height: "24px", color: "#d1d5db" }}
                  />
                }
                message="Belum ada faktur"
              />
            ) : (
              recentInvoices.map((inv) => {
                const statusCfg =
                  PAYMENT_STATUS[inv.payment_status] || PAYMENT_STATUS.unpaid;
                return (
                  <RowItem
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.invoice_number}`)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#111827",
                          margin: "0 0 2px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {inv.customer.name}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#9ca3af",
                          fontFamily: "monospace",
                          margin: 0,
                        }}
                      >
                        {inv.invoice_number}
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginLeft: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#374151",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatCurrency(inv.grand_total)}
                      </span>
                      <StatusBadge config={statusCfg} />
                    </div>
                  </RowItem>
                );
              })
            )}
          </SectionCard>

          <SectionCard
            title="Pekerjaan Tertunda"
            badge={stats.pendingJobs}
            onViewAll={() => navigate("/jobs?status=pending")}
          >
            {loading ? (
              <div
                style={{
                  padding: "12px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        flex: 1,
                      }}
                    >
                      <Skeleton w="65%" h="13px" />
                      <Skeleton w="40%" h="11px" />
                    </div>
                    <Skeleton w="18%" h="22px" />
                  </div>
                ))}
              </div>
            ) : pendingJobs.length === 0 ? (
              <EmptyState
                icon={
                  <CheckCircle2
                    style={{ width: "24px", height: "24px", color: "#16a34a" }}
                  />
                }
                message="Semua pekerjaan sudah ditugaskan"
                positive
              />
            ) : (
              pendingJobs.map((job) => {
                const priCfg = PRIORITY[job.priority] || PRIORITY.normal;
                return (
                  <RowItem
                    key={job.id}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    warning
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#111827",
                          margin: "0 0 2px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {job.title}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#9ca3af",
                          margin: 0,
                        }}
                      >
                        {job.invoice.customer.name}
                      </p>
                    </div>
                    <StatusBadge config={priCfg} />
                  </RowItem>
                );
              })
            )}
          </SectionCard>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <SectionCard
            title="Peringatan Stok"
            badge={stockAlerts.length}
            onViewAll={() => navigate("/inventory")}
          >
            {loading ? (
              <div
                style={{
                  padding: "12px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {[1, 2].map((i) => (
                  <Skeleton key={i} h="40px" />
                ))}
              </div>
            ) : stockAlerts.length === 0 ? (
              <EmptyState
                icon={
                  <Package
                    style={{ width: "24px", height: "24px", color: "#16a34a" }}
                  />
                }
                message="Semua stok dalam kondisi baik"
                positive
              />
            ) : (
              stockAlerts.map((alert) => (
                <RowItem key={alert.id} warning>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        background: "#fef9c3",
                        borderRadius: "8px",
                        padding: "6px",
                        flexShrink: 0,
                      }}
                    >
                      <AlertTriangle
                        style={{
                          width: "14px",
                          height: "14px",
                          color: "#d97706",
                        }}
                      />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#111827",
                          margin: "0 0 1px",
                        }}
                      >
                        {alert.product.name}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#9ca3af",
                          margin: 0,
                        }}
                      >
                        Stok:{" "}
                        <strong style={{ color: "#dc2626" }}>
                          {alert.product.stock}
                        </strong>{" "}
                        · Min: {alert.product.min_stock_threshold}
                      </p>
                    </div>
                  </div>
                </RowItem>
              ))
            )}
          </SectionCard>

          <SectionCard
            title="Status Teknisi"
            onViewAll={() => navigate("/technicians")}
          >
            {loading ? (
              <div
                style={{
                  padding: "12px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <Skeleton w="28px" h="28px" />
                      <Skeleton w="100px" h="13px" />
                    </div>
                    <Skeleton w="70px" h="22px" />
                  </div>
                ))}
              </div>
            ) : technicians.length === 0 ? (
              <EmptyState
                icon={
                  <Users
                    style={{ width: "24px", height: "24px", color: "#d1d5db" }}
                  />
                }
                message="Belum ada teknisi terdaftar"
              />
            ) : (
              technicians.map((tech) => {
                const isAvailable = tech.active_jobs_count === 0;
                return (
                  <RowItem key={tech.id}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: isAvailable ? "#dcfce7" : "#fef9c3",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          fontWeight: 700,
                          color: isAvailable ? "#16a34a" : "#d97706",
                        }}
                      >
                        {tech.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#374151",
                        }}
                      >
                        {tech.name}
                      </span>
                    </div>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: isAvailable ? "#16a34a" : "#d97706",
                        background: isAvailable ? "#dcfce7" : "#fef9c3",
                        padding: "3px 10px",
                        borderRadius: "20px",
                      }}
                    >
                      <span
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: "currentColor",
                          display: "inline-block",
                        }}
                      />
                      {isAvailable
                        ? "Tersedia"
                        : `${tech.active_jobs_count} Job Aktif`}
                    </span>
                  </RowItem>
                );
              })
            )}
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
}

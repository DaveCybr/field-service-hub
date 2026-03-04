// InvoiceDetail.tsx
import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Loader2, ArrowLeft, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

import { InvoiceHeader } from "@/components/invoices/detail/InvoiceHeader";
import { InvoiceSummaryTab } from "@/components/invoices/detail/InvoiceSummaryTab";
import { ServicesTab } from "@/components/invoices/detail/ServicesTab";
import { ProductsTab } from "@/components/invoices/detail/ProductsTab";
import { PaymentTab } from "@/components/invoices/detail/PaymentTab";
import { TimelineTab } from "@/components/invoices/detail/TimelineTab";
import { DocumentsTab } from "@/components/invoices/detail/DocumentsTab";
import { InvoicePrintTemplate } from "@/components/invoices/InvoicePrintTemplate";
import { useInvoiceDetail } from "@/hooks/invoices/useInvoiceDetail";

const TABS = [
  { value: "summary", label: "Ringkasan" },
  { value: "services", label: "Layanan", countKey: "services" },
  { value: "products", label: "Produk", countKey: "items" },
  { value: "payment", label: "Pembayaran" },
  { value: "timeline", label: "Riwayat" },
  { value: "documents", label: "Dokumen" },
] as const;

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperadmin, isAdmin } = useAuth();
  const { invoice, services, items, loading, refetch } = useInvoiceDetail(
    id || "",
  );
  const [activeTab, setActiveTab] = useState<string>("summary");

  const canEdit = isSuperadmin || isAdmin;
  const handlePrint = () => window.print();

  // ── Loading ────────────────────────────────────────────────
  if (loading)
    return (
      <DashboardLayout>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
          <p className="text-sm text-slate-400 font-medium">Memuat faktur...</p>
        </div>
      </DashboardLayout>
    );

  // ── Not Found ──────────────────────────────────────────────
  if (!invoice)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-slate-600 font-semibold">Faktur tidak ditemukan</p>
          <Link
            to="/invoices"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            ← Kembali ke Daftar Faktur
          </Link>
        </div>
      </DashboardLayout>
    );

  const counts: Record<string, number> = {
    services: services.length,
    items: items.length,
  };

  return (
    <>
      <InvoicePrintTemplate
        invoice={invoice}
        services={services}
        items={items}
        companyInfo={{
          name: "RAFA ELEKTRONIK",
          address: "Tekoan, Tanggul Kulon, Tanggul, Jember Regency, East Java",
          phone: "+62 823-3570-4609",
          email: "rafaelektronik99@gmail.com",
          logo: "/logo-rafa.jpg",
        }}
      />

      <DashboardLayout>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          .id-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
          .id-fade { animation: idFade 0.22s ease both; }
          @keyframes idFade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
          .id-tab { padding: 8px 16px; font-size: 13px; font-weight: 600; color: #64748b; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.15s; white-space: nowrap; margin-bottom: -1px; }
          .id-tab:hover:not(.active) { color: #0f172a; background: #f8fafc; }
          .id-tab.active { color: #0f172a; border-bottom-color: #0f172a; }
          @media print { .id-root { display: none; } }
        `}</style>

        <div className="id-root id-fade space-y-5">
          {/* ── Breadcrumb ── */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Link
              to="/invoices"
              className="hover:text-slate-600 transition-colors font-medium"
            >
              Faktur
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-slate-600 font-semibold font-mono">
              {invoice.invoice_number}
            </span>
          </div>

          {/* ── Invoice Header (existing component) ── */}
          <InvoiceHeader
            invoice={invoice}
            canEdit={canEdit}
            onRefresh={refetch}
            onPrint={handlePrint}
          />

          {/* ── Tab Bar ── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Tab Pills */}
            <div className="flex items-center border-b border-slate-100 px-2 overflow-x-auto">
              {TABS.map((tab) => {
                const count = "countKey" in tab ? counts[tab.countKey] : null;
                return (
                  <button
                    key={tab.value}
                    className={cn(
                      "id-tab",
                      activeTab === tab.value && "active",
                    )}
                    onClick={() => setActiveTab(tab.value)}
                  >
                    {tab.label}
                    {count !== null && count > 0 && (
                      <span
                        className={cn(
                          "ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                          activeTab === tab.value
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="p-5">
              {activeTab === "summary" && (
                <InvoiceSummaryTab invoice={invoice} />
              )}
              {activeTab === "services" && (
                <ServicesTab services={services} invoiceId={invoice.id} />
              )}
              {activeTab === "products" && <ProductsTab items={items} />}
              {activeTab === "payment" && (
                <PaymentTab invoice={invoice} onPaymentRecorded={refetch} />
              )}
              {activeTab === "timeline" && <TimelineTab invoice={invoice} />}
              {activeTab === "documents" && <DocumentsTab invoice={invoice} />}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

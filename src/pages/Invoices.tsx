// Invoices.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Plus, FileText, Map } from "lucide-react";
import { InvoiceMapView } from "@/components/invoices/InvoiceMapView";
import { InvoiceList } from "@/components/invoices/InvoiceList";
import { cn } from "@/lib/utils";

export default function Invoices() {
  const [activeTab, setActiveTab] = useState<"list" | "map">("list");

  return (
    <DashboardLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .inv-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .inv-fade { animation: invFade 0.22s ease both; }
        @keyframes invFade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .view-tab { border-radius: 8px; padding: 6px 14px; font-size: 13px; font-weight: 600; display:flex; align-items:center; gap:6px; transition: all 0.15s; border: none; cursor: pointer; }
        .view-tab.active { background: #0f172a; color: white; }
        .view-tab:not(.active) { background: transparent; color: #64748b; }
        .view-tab:not(.active):hover { background: #f1f5f9; color: #0f172a; }
      `}</style>

      <div className="inv-root inv-fade space-y-5">
        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Keuangan
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Faktur
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Kelola faktur, layanan, dan pembayaran
            </p>
          </div>

          <Link
            to="/invoices/new"
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Buat Faktur
          </Link>
        </div>

        {/* ── View Toggle ── */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          <button
            className={cn("view-tab", activeTab === "list" && "active")}
            onClick={() => setActiveTab("list")}
          >
            <FileText className="h-3.5 w-3.5" />
            Daftar
          </button>
          <button
            className={cn("view-tab", activeTab === "map" && "active")}
            onClick={() => setActiveTab("map")}
          >
            <Map className="h-3.5 w-3.5" />
            Peta
          </button>
        </div>

        {/* ── Content ── */}
        <div>{activeTab === "list" ? <InvoiceList /> : <InvoiceMapView />}</div>
      </div>
    </DashboardLayout>
  );
}

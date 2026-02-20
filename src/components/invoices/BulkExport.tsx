import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Table, Loader2 } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Invoice {
  id: string;
  invoice_number: string;
  customer?: { name: string };
  invoice_date: string;
  grand_total: number;
  status: string;
  payment_status: string;
}

interface BulkExportProps {
  selectedIds: string[];
  allInvoices: Invoice[];
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Menunggu",
  assigned: "Ditugaskan",
  in_progress: "Sedang Dikerjakan",
  completed: "Selesai",
  paid: "Lunas",
  cancelled: "Dibatalkan",
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Belum Bayar",
  partial: "Bayar Sebagian",
  paid: "Lunas",
};

export function BulkExport({ selectedIds, allInvoices }: BulkExportProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const selectedInvoices = allInvoices.filter((inv) =>
    selectedIds.includes(inv.id),
  );

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text("Data Faktur", 14, 20);

      doc.setFontSize(10);
      doc.text(`Diekspor: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);
      doc.text(`Total Faktur: ${selectedInvoices.length}`, 14, 34);

      const tableData = selectedInvoices.map((inv) => [
        inv.invoice_number,
        inv.customer?.name || "-",
        format(new Date(inv.invoice_date), "dd/MM/yyyy"),
        `Rp ${inv.grand_total.toLocaleString("id-ID")}`,
        STATUS_LABELS[inv.status] || inv.status,
        PAYMENT_LABELS[inv.payment_status] || inv.payment_status,
      ]);

      autoTable(doc, {
        head: [
          [
            "No. Faktur",
            "Pelanggan",
            "Tanggal",
            "Total",
            "Status",
            "Pembayaran",
          ],
        ],
        body: tableData,
        startY: 40,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      doc.save(`faktur-ekspor-${format(new Date(), "yyyy-MM-dd")}.pdf`);

      toast({
        title: "PDF Berhasil Diekspor",
        description: `${selectedInvoices.length} faktur telah diekspor`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ekspor Gagal",
        description: error.message || "Gagal mengekspor PDF",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const data = selectedInvoices.map((inv) => ({
        "No. Faktur": inv.invoice_number,
        Pelanggan: inv.customer?.name || "-",
        Tanggal: format(new Date(inv.invoice_date), "dd/MM/yyyy"),
        Total: inv.grand_total,
        Status: STATUS_LABELS[inv.status] || inv.status,
        Pembayaran: PAYMENT_LABELS[inv.payment_status] || inv.payment_status,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Faktur");

      const maxWidth = data.reduce(
        (w, r) => Math.max(w, r["Pelanggan"].length),
        10,
      );
      ws["!cols"] = [
        { wch: 22 },
        { wch: maxWidth },
        { wch: 14 },
        { wch: 18 },
        { wch: 20 },
        { wch: 18 },
      ];

      XLSX.writeFile(
        wb,
        `faktur-ekspor-${format(new Date(), "yyyy-MM-dd")}.xlsx`,
      );

      toast({
        title: "Excel Berhasil Diekspor",
        description: `${selectedInvoices.length} faktur telah diekspor`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ekspor Gagal",
        description: error.message || "Gagal mengekspor Excel",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const headers = [
        "No. Faktur",
        "Pelanggan",
        "Tanggal",
        "Total",
        "Status",
        "Pembayaran",
      ];

      const rows = selectedInvoices.map((inv) => [
        inv.invoice_number,
        inv.customer?.name || "-",
        format(new Date(inv.invoice_date), "dd/MM/yyyy"),
        inv.grand_total,
        STATUS_LABELS[inv.status] || inv.status,
        PAYMENT_LABELS[inv.payment_status] || inv.payment_status,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `faktur-ekspor-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();

      toast({
        title: "CSV Berhasil Diekspor",
        description: `${selectedInvoices.length} faktur telah diekspor`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ekspor Gagal",
        description: error.message || "Gagal mengekspor CSV",
      });
    } finally {
      setExporting(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exporting}>
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mengekspor...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Ekspor ({selectedIds.length})
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Ekspor sebagai PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <Table className="mr-2 h-4 w-4" />
          Ekspor sebagai Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="mr-2 h-4 w-4" />
          Ekspor sebagai CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

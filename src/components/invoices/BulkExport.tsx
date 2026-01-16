import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
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

export function BulkExport({ selectedIds, allInvoices }: BulkExportProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const selectedInvoices = allInvoices.filter((inv) =>
    selectedIds.includes(inv.id)
  );

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.text("Data Invoice", 14, 20);

      // Metadata
      doc.setFontSize(10);
      doc.text(`Exported: ${format(new Date(), "PPP 'at' p")}`, 14, 28);
      doc.text(`Total Invoices: ${selectedInvoices.length}`, 14, 34);

      // Table
      const tableData = selectedInvoices.map((inv) => [
        inv.invoice_number,
        inv.customer?.name || "N/A",
        format(new Date(inv.invoice_date), "dd/MM/yyyy"),
        `Rp ${inv.grand_total.toLocaleString()}`,
        inv.status,
        inv.payment_status,
      ]);

      autoTable(doc, {
        head: [
          ["Invoice #", "Customer", "Date", "Amount", "Status", "Payment"],
        ],
        body: tableData,
        startY: 40,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      // Save
      doc.save(`invoices-export-${format(new Date(), "yyyy-MM-dd")}.pdf`);

      toast({
        title: "PDF Exported",
        description: `${selectedInvoices.length} invoices exported successfully`,
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error.message || "Failed to export PDF",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const data = selectedInvoices.map((inv) => ({
        "Invoice Number": inv.invoice_number,
        Customer: inv.customer?.name || "N/A",
        Date: format(new Date(inv.invoice_date), "dd/MM/yyyy"),
        Amount: inv.grand_total,
        Status: inv.status,
        "Payment Status": inv.payment_status,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Invoices");

      // Auto-size columns
      const maxWidth = data.reduce(
        (w, r) => Math.max(w, r["Customer"].length),
        10
      );
      ws["!cols"] = [
        { wch: 20 }, // Invoice Number
        { wch: maxWidth }, // Customer
        { wch: 12 }, // Date
        { wch: 15 }, // Amount
        { wch: 15 }, // Status
        { wch: 15 }, // Payment Status
      ];

      XLSX.writeFile(
        wb,
        `invoices-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`
      );

      toast({
        title: "Excel Exported",
        description: `${selectedInvoices.length} invoices exported successfully`,
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error.message || "Failed to export Excel",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const headers = [
        "Invoice Number",
        "Customer",
        "Date",
        "Amount",
        "Status",
        "Payment Status",
      ];

      const rows = selectedInvoices.map((inv) => [
        inv.invoice_number,
        inv.customer?.name || "N/A",
        format(new Date(inv.invoice_date), "dd/MM/yyyy"),
        inv.grand_total,
        inv.status,
        inv.payment_status,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `invoices-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();

      toast({
        title: "CSV Exported",
        description: `${selectedInvoices.length} invoices exported successfully`,
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error.message || "Failed to export CSV",
      });
    } finally {
      setExporting(false);
    }
  };

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exporting}>
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export ({selectedIds.length})
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <Table className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ExportProducts.tsx - Utility for exporting products to Excel/CSV

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

interface Product {
  sku: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  stock: number;
  min_stock_threshold: number;
  is_active: boolean;
  created_at: string;
}

interface ExportProductsProps {
  products: Product[];
}

export function ExportProducts({ products }: ExportProductsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      spare_parts: "Spare Parts",
      consumables: "Consumables",
      equipment: "Equipment",
      accessories: "Accessories",
      service_labor: "Service/Labor",
    };
    return categories[category] || category;
  };

  const exportToCSV = () => {
    // CSV Headers
    const headers = [
      "SKU",
      "Name",
      "Description",
      "Category",
      "Unit",
      "Cost Price",
      "Sell Price",
      "Stock",
      "Min Stock",
      "Active",
      "Created At",
    ];

    // CSV Rows
    const rows = products.map((product) => [
      product.sku,
      product.name,
      product.description || "",
      getCategoryLabel(product.category),
      product.unit,
      product.cost_price,
      product.sell_price,
      product.stock,
      product.min_stock_threshold,
      product.is_active ? "Yes" : "No",
      new Date(product.created_at).toLocaleDateString("id-ID"),
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `products_${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    // Create HTML table
    const headers = [
      "SKU",
      "Name",
      "Description",
      "Category",
      "Unit",
      "Cost Price",
      "Sell Price",
      "Stock",
      "Min Stock",
      "Active",
      "Created At",
    ];

    const rows = products.map((product) => [
      product.sku,
      product.name,
      product.description || "",
      getCategoryLabel(product.category),
      product.unit,
      formatCurrency(product.cost_price),
      formatCurrency(product.sell_price),
      product.stock,
      product.min_stock_threshold,
      product.is_active ? "Yes" : "No",
      new Date(product.created_at).toLocaleDateString("id-ID"),
    ]);

    // Create Excel-compatible HTML
    const html = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) =>
                    `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Download file
    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `products_${Date.now()}.xls`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="mr-2 h-4 w-4" />
          Export to CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export to Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

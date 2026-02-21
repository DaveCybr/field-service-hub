// InvoiceHeader.tsx (create)
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function InvoiceHeader() {
  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" asChild>
        <Link to="/invoices">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Buat Faktur Baru</h1>
        <p className="text-muted-foreground">
          Tambahkan layanan dan produk untuk membuat faktur transaksi baru
        </p>
      </div>
    </div>
  );
}

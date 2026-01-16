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
        <h1 className="text-2xl font-bold tracking-tight">
          Create New Invoice
        </h1>
        <p className="text-muted-foreground">
          Add services and products to create a new invoice transaction
        </p>
      </div>
    </div>
  );
}

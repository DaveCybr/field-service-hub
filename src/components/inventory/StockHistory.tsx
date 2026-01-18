// StockHistory.tsx - Component to view stock transaction history

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, TrendingUp, TrendingDown, Package } from "lucide-react";
import { format } from "date-fns";

interface StockTransaction {
  id: string;
  transaction_type: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  notes: string | null;
  created_at: string;
  created_by_employee: {
    name: string;
  } | null;
}

interface StockHistoryProps {
  productId: string | null;
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockHistory({
  productId,
  productName,
  open,
  onOpenChange,
}: StockHistoryProps) {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && productId) {
      loadHistory();
    }
  }, [open, productId]);

  const loadHistory = async () => {
    if (!productId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(
          `
          *,
          created_by_employee:employees!created_by(name)
        `
        )
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string, quantity: number) => {
    if (quantity > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (quantity < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Package className="h-4 w-4 text-muted-foreground" />;
  };

  const getTransactionBadge = (type: string) => {
    const types: Record<string, { label: string; variant: any }> = {
      adjustment: { label: "Adjustment", variant: "secondary" },
      sale: { label: "Sale", variant: "default" },
      purchase: { label: "Purchase", variant: "default" },
      return: { label: "Return", variant: "outline" },
      damage: { label: "Damage", variant: "destructive" },
      transfer: { label: "Transfer", variant: "outline" },
    };

    const config = types[type] || { label: type, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Stock History</DialogTitle>
          <DialogDescription>
            Transaction history for <strong>{productName}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="mt-4 text-sm text-muted-foreground">
              No transaction history found
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Change</TableHead>
                  <TableHead className="text-center">Before</TableHead>
                  <TableHead className="text-center">After</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">
                      {format(new Date(tx.created_at), "dd MMM yyyy")}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), "HH:mm:ss")}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getTransactionBadge(tx.transaction_type)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getTransactionIcon(tx.transaction_type, tx.quantity)}
                        <span
                          className={`font-medium ${
                            tx.quantity > 0
                              ? "text-green-600"
                              : tx.quantity < 0
                              ? "text-red-600"
                              : ""
                          }`}
                        >
                          {tx.quantity > 0 ? "+" : ""}
                          {tx.quantity}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {tx.stock_before}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {tx.stock_after}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {tx.notes || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.created_by_employee?.name || "System"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

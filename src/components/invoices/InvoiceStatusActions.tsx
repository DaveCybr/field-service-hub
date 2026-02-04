// ============================================
// InvoiceStatusActions.tsx
// Manual status change buttons for Invoice Header
// Only for specific roles and transitions
// ============================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  DollarSign,
  Archive,
  Ban,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils/currency";

interface InvoiceStatusActionsProps {
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
    payment_status: string;
    grand_total: number;
    amount_paid: number;
  };
  onStatusChanged?: () => void;
}

export function InvoiceStatusActions({
  invoice,
  onStatusChanged,
}: InvoiceStatusActionsProps) {
  const { toast } = useToast();
  const { employee } = useAuth();

  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const [action, setAction] = useState<"confirm" | "archive" | "cancel" | null>(
    null
  );
  const [cancelReason, setCancelReason] = useState("");

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState(
    invoice.grand_total - invoice.amount_paid
  );
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Check permissions
  const canManage = employee?.role
    ? ["superadmin", "admin", "manager"].includes(employee.role)
    : false;

  const isCashier = employee?.role === "cashier";

  // ============================================
  // MANUAL STATUS CHANGES
  // ============================================

  // 1. Confirm Invoice (draft → pending)
  const handleConfirmInvoice = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("invoices")
        .update({
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      if (error) throw error;

      // Log to audit_logs instead of invoice_status_history
      await supabase.from("audit_logs").insert({
        entity_type: "invoices",
        entity_id: invoice.id,
        action: "STATUS_CHANGE",
        old_data: { status: invoice.status },
        new_data: { status: "pending" },
        employee_id: employee?.id,
      });

      toast({
        title: "Invoice Confirmed",
        description: `Invoice ${invoice.invoice_number} is now pending`,
      });

      if (onStatusChanged) onStatusChanged();
    } catch (error: any) {
      console.error("Error confirming invoice:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to confirm invoice",
      });
    } finally {
      setLoading(false);
      setConfirmDialogOpen(false);
    }
  };

  // 2. Receive Payment (completed → paid)
  const handleReceivePayment = async () => {
    try {
      setLoading(true);

      // Validate payment amount
      const remainingAmount = invoice.grand_total - invoice.amount_paid;
      if (paymentAmount <= 0 || paymentAmount > remainingAmount) {
        toast({
          variant: "destructive",
          title: "Invalid Amount",
          description: `Payment must be between 0 and ${formatCurrency(remainingAmount)}`,
        });
        return;
      }

      // Update invoice payment status directly (no separate payments table)
      const newAmountPaid = invoice.amount_paid + paymentAmount;
      const newPaymentStatus =
        newAmountPaid >= invoice.grand_total
          ? "paid"
          : newAmountPaid > 0
            ? "partial"
            : "unpaid";

      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          amount_paid: newAmountPaid,
          payment_status: newPaymentStatus,
          status: newPaymentStatus === "paid" ? "paid" : invoice.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      if (invoiceError) throw invoiceError;

      // Log payment to audit_logs
      await supabase.from("audit_logs").insert({
        entity_type: "invoices",
        entity_id: invoice.id,
        action: "PAYMENT",
        old_data: { amount_paid: invoice.amount_paid, payment_status: invoice.payment_status },
        new_data: { 
          amount_paid: newAmountPaid, 
          payment_status: newPaymentStatus,
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          payment_notes: paymentNotes,
        },
        employee_id: employee?.id,
      });

      toast({
        title: "Payment Received",
        description: `Payment of ${formatCurrency(paymentAmount)} recorded successfully`,
      });

      // Reset form
      setPaymentAmount(0);
      setPaymentMethod("cash");
      setPaymentReference("");
      setPaymentNotes("");

      if (onStatusChanged) onStatusChanged();
    } catch (error: any) {
      console.error("Error receiving payment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to receive payment",
      });
    } finally {
      setLoading(false);
      setPaymentDialogOpen(false);
    }
  };

  // 3. Archive Invoice (paid → closed)
  const handleArchiveInvoice = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("invoices")
        .update({
          status: "closed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      if (error) throw error;

      // Log to audit_logs
      await supabase.from("audit_logs").insert({
        entity_type: "invoices",
        entity_id: invoice.id,
        action: "STATUS_CHANGE",
        old_data: { status: invoice.status },
        new_data: { status: "closed" },
        employee_id: employee?.id,
      });

      toast({
        title: "Invoice Archived",
        description: `Invoice ${invoice.invoice_number} has been archived`,
      });

      if (onStatusChanged) onStatusChanged();
    } catch (error: any) {
      console.error("Error archiving invoice:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to archive invoice",
      });
    } finally {
      setLoading(false);
      setConfirmDialogOpen(false);
    }
  };

  // 4. Cancel Invoice (any → cancelled)
  const handleCancelInvoice = async () => {
    try {
      setLoading(true);

      if (!cancelReason.trim()) {
        toast({
          variant: "destructive",
          title: "Reason Required",
          description: "Please provide a reason for cancellation",
        });
        return;
      }

      const { error } = await supabase
        .from("invoices")
        .update({
          status: "cancelled",
          admin_notes: cancelReason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      if (error) throw error;

      // Log to audit_logs
      await supabase.from("audit_logs").insert({
        entity_type: "invoices",
        entity_id: invoice.id,
        action: "STATUS_CHANGE",
        old_data: { status: invoice.status },
        new_data: { status: "cancelled", reason: cancelReason },
        employee_id: employee?.id,
      });

      toast({
        title: "Invoice Cancelled",
        description: `Invoice ${invoice.invoice_number} has been cancelled`,
      });

      setCancelReason("");
      if (onStatusChanged) onStatusChanged();
    } catch (error: any) {
      console.error("Error cancelling invoice:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to cancel invoice",
      });
    } finally {
      setLoading(false);
      setCancelDialogOpen(false);
    }
  };

  // ============================================
  // RENDER BUTTONS BASED ON PERMISSIONS & STATUS
  // ============================================

  return (
    <div className="flex items-center gap-2">
      {/* 1. Confirm Invoice (draft → pending) - Admin/Manager only */}
      {invoice.status === "draft" && canManage && (
        <Button
          size="sm"
          onClick={() => {
            setAction("confirm");
            setConfirmDialogOpen(true);
          }}
          disabled={loading}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Confirm Invoice
        </Button>
      )}

      {/* 2. Receive Payment (completed → paid) - Cashier/Admin/Manager */}
      {invoice.status === "completed" &&
        invoice.payment_status !== "paid" &&
        (isCashier || canManage) && (
          <Button
            size="sm"
            variant="default"
            onClick={() => setPaymentDialogOpen(true)}
            disabled={loading}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Receive Payment
          </Button>
        )}

      {/* 3. Archive Invoice (paid → closed) - Admin/Manager only */}
      {invoice.status === "paid" && canManage && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setAction("archive");
            setConfirmDialogOpen(true);
          }}
          disabled={loading}
        >
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </Button>
      )}

      {/* 4. Cancel Invoice (any → cancelled) - Admin/Manager only */}
      {invoice.status !== "cancelled" &&
        invoice.status !== "closed" &&
        canManage && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setCancelDialogOpen(true)}
            disabled={loading}
          >
            <Ban className="h-4 w-4 mr-2" />
            Cancel Invoice
          </Button>
        )}

      {/* ============================================ */}
      {/* DIALOGS */}
      {/* ============================================ */}

      {/* Confirm/Archive Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "confirm" ? "Confirm Invoice" : "Archive Invoice"}
            </DialogTitle>
            <DialogDescription>
              {action === "confirm"
                ? `Are you sure you want to confirm invoice ${invoice.invoice_number}? This will change the status to "pending" and allow team assignment.`
                : `Are you sure you want to archive invoice ${invoice.invoice_number}? This will mark it as closed and completed.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={
                action === "confirm"
                  ? handleConfirmInvoice
                  : handleArchiveInvoice
              }
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {action === "confirm" ? "Confirm" : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
            <DialogDescription>
              Record payment for invoice {invoice.invoice_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Invoice Summary */}
            <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grand Total:</span>
                <span className="font-medium">
                  {formatCurrency(invoice.grand_total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already Paid:</span>
                <span className="font-medium">
                  {formatCurrency(invoice.amount_paid)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-muted-foreground font-medium">
                  Remaining:
                </span>
                <span className="font-bold text-lg">
                  {formatCurrency(invoice.grand_total - invoice.amount_paid)}
                </span>
              </div>
            </div>

            {/* Payment Amount */}
            <div className="space-y-2">
              <Label htmlFor="payment-amount">
                Payment Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="payment-amount"
                type="number"
                min="0"
                max={invoice.grand_total - invoice.amount_paid}
                step="0.01"
                value={paymentAmount}
                onChange={(e) =>
                  setPaymentAmount(parseFloat(e.target.value) || 0)
                }
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="e_wallet">E-Wallet</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reference Number */}
            <div className="space-y-2">
              <Label htmlFor="payment-reference">Reference Number (Optional)</Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Transaction ID, Check #, etc."
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes (Optional)</Label>
              <Textarea
                id="payment-notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleReceivePayment} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel invoice {invoice.invoice_number}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">
                Reason for cancellation <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Explain why this invoice is being cancelled..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={loading}
            >
              Keep Invoice
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelInvoice}
              disabled={loading || !cancelReason.trim()}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  AlertCircle,
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
    null,
  );
  const [cancelReason, setCancelReason] = useState("");

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState(
    invoice.grand_total - invoice.amount_paid,
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
          status_updated_at: new Date().toISOString(),
          status_updated_by: employee?.id,
        })
        .eq("id", invoice.id);

      if (error) throw error;

      // Log status history
      await supabase.from("invoice_status_history").insert({
        invoice_id: invoice.id,
        old_status: invoice.status,
        new_status: "pending",
        changed_by: employee?.id,
        reason: "Invoice confirmed by admin",
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

      // Insert payment record
      const { error: paymentError } = await supabase
        .from("invoice_payments")
        .insert({
          invoice_id: invoice.id,
          amount: paymentAmount,
          payment_method: paymentMethod,
          reference_number: paymentReference || null,
          notes: paymentNotes || null,
          processed_by: employee?.id,
          status: "completed",
        });

      if (paymentError) throw paymentError;

      // Update invoice payment status
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
          status_updated_at: new Date().toISOString(),
          status_updated_by: employee?.id,
        })
        .eq("id", invoice.id);

      if (invoiceError) throw invoiceError;

      // Log status history if status changed to paid
      if (newPaymentStatus === "paid") {
        await supabase.from("invoice_status_history").insert({
          invoice_id: invoice.id,
          old_status: invoice.status,
          new_status: "paid",
          changed_by: employee?.id,
          reason: "Payment received - invoice fully paid",
        });
      }

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
          status_updated_at: new Date().toISOString(),
          status_updated_by: employee?.id,
        })
        .eq("id", invoice.id);

      if (error) throw error;

      // Log status history
      await supabase.from("invoice_status_history").insert({
        invoice_id: invoice.id,
        old_status: invoice.status,
        new_status: "closed",
        changed_by: employee?.id,
        reason: "Invoice archived",
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
          status_updated_at: new Date().toISOString(),
          status_updated_by: employee?.id,
        })
        .eq("id", invoice.id);

      if (error) throw error;

      // Log status history
      await supabase.from("invoice_status_history").insert({
        invoice_id: invoice.id,
        old_status: invoice.status,
        new_status: "cancelled",
        changed_by: employee?.id,
        reason: cancelReason,
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
              <Label htmlFor="payment-reference">
                Reference Number (Optional)
              </Label>
              <Input
                id="payment-reference"
                placeholder="e.g., TRX123456, Transfer receipt #"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes (Optional)</Label>
              <Textarea
                id="payment-notes"
                placeholder="Additional notes..."
                rows={2}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
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
              Receive Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Cancel Invoice
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel invoice {invoice.invoice_number}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">
                Cancellation Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="cancel-reason"
                placeholder="Please provide a reason for cancelling this invoice..."
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setCancelReason("");
              }}
              disabled={loading}
            >
              No, Keep Invoice
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelInvoice}
              disabled={loading || !cancelReason.trim()}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, Cancel Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// InvoiceStatusActions.tsx
// Tombol aksi perubahan status faktur
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
import { CheckCircle, DollarSign, Archive, Ban, Loader2 } from "lucide-react";
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
  const [action, setAction] = useState<"confirm" | "archive" | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [paymentAmount, setPaymentAmount] = useState(
    invoice.grand_total - invoice.amount_paid,
  );
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const canManage = employee?.role
    ? ["superadmin", "admin", "manager"].includes(employee.role)
    : false;

  const isCashier = employee?.role === "cashier";

  // ✅ FIX: Pembayaran bisa diterima di status completed, assigned, in_progress
  const canReceivePayment =
    invoice.payment_status !== "paid" &&
    ["completed", "assigned", "in_progress"].includes(invoice.status) &&
    (isCashier || canManage);

  // 1. Konfirmasi Faktur (draft → pending)
  const handleConfirmInvoice = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("invoices")
        .update({ status: "pending", updated_at: new Date().toISOString() })
        .eq("id", invoice.id);

      if (error) throw error;

      await supabase.from("audit_logs").insert({
        entity_type: "invoices",
        entity_id: invoice.id,
        action: "STATUS_CHANGE",
        old_data: { status: invoice.status },
        new_data: { status: "pending" },
        employee_id: employee?.id,
      });

      toast({
        title: "Faktur Dikonfirmasi",
        description: `Faktur ${invoice.invoice_number} sekarang menunggu proses`,
      });

      if (onStatusChanged) onStatusChanged();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: error.message || "Gagal mengkonfirmasi faktur",
      });
    } finally {
      setLoading(false);
      setConfirmDialogOpen(false);
    }
  };

  // 2. Terima Pembayaran
  const handleReceivePayment = async () => {
    try {
      setLoading(true);

      const remainingAmount = invoice.grand_total - invoice.amount_paid;
      if (paymentAmount <= 0 || paymentAmount > remainingAmount) {
        toast({
          variant: "destructive",
          title: "Nominal Tidak Valid",
          description: `Pembayaran harus antara Rp 1 dan ${formatCurrency(remainingAmount)}`,
        });
        return;
      }

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

      await supabase.from("audit_logs").insert({
        entity_type: "invoices",
        entity_id: invoice.id,
        action: "PAYMENT",
        old_data: {
          amount_paid: invoice.amount_paid,
          payment_status: invoice.payment_status,
        },
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
        title: "Pembayaran Tercatat",
        description: `Pembayaran ${formatCurrency(paymentAmount)} berhasil dicatat`,
      });

      setPaymentAmount(0);
      setPaymentMethod("cash");
      setPaymentReference("");
      setPaymentNotes("");

      if (onStatusChanged) onStatusChanged();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: error.message || "Gagal mencatat pembayaran",
      });
    } finally {
      setLoading(false);
      setPaymentDialogOpen(false);
    }
  };

  // 3. Arsipkan Faktur (paid → closed)
  const handleArchiveInvoice = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("invoices")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", invoice.id);

      if (error) throw error;

      await supabase.from("audit_logs").insert({
        entity_type: "invoices",
        entity_id: invoice.id,
        action: "STATUS_CHANGE",
        old_data: { status: invoice.status },
        new_data: { status: "closed" },
        employee_id: employee?.id,
      });

      toast({
        title: "Faktur Diarsipkan",
        description: `Faktur ${invoice.invoice_number} telah diarsipkan`,
      });

      if (onStatusChanged) onStatusChanged();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: error.message || "Gagal mengarsipkan faktur",
      });
    } finally {
      setLoading(false);
      setConfirmDialogOpen(false);
    }
  };

  // 4. Batalkan Faktur
  const handleCancelInvoice = async () => {
    try {
      setLoading(true);

      if (!cancelReason.trim()) {
        toast({
          variant: "destructive",
          title: "Alasan Diperlukan",
          description: "Mohon masukkan alasan pembatalan",
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

      await supabase.from("audit_logs").insert({
        entity_type: "invoices",
        entity_id: invoice.id,
        action: "STATUS_CHANGE",
        old_data: { status: invoice.status },
        new_data: { status: "cancelled", reason: cancelReason },
        employee_id: employee?.id,
      });

      toast({
        title: "Faktur Dibatalkan",
        description: `Faktur ${invoice.invoice_number} telah dibatalkan`,
      });

      setCancelReason("");
      if (onStatusChanged) onStatusChanged();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: error.message || "Gagal membatalkan faktur",
      });
    } finally {
      setLoading(false);
      setCancelDialogOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* 1. Konfirmasi (draft → pending) */}
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
          Konfirmasi
        </Button>
      )}

      {/* 2. Terima Pembayaran — ✅ FIX: tidak hanya di status "completed" */}
      {canReceivePayment && (
        <Button
          size="sm"
          variant="default"
          onClick={() => setPaymentDialogOpen(true)}
          disabled={loading}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Terima Pembayaran
        </Button>
      )}

      {/* 3. Arsipkan (paid → closed) */}
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
          Arsipkan
        </Button>
      )}

      {/* 4. Batalkan */}
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
            Batalkan
          </Button>
        )}

      {/* Dialog Konfirmasi / Arsipkan */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "confirm" ? "Konfirmasi Faktur" : "Arsipkan Faktur"}
            </DialogTitle>
            <DialogDescription>
              {action === "confirm"
                ? `Konfirmasi faktur ${invoice.invoice_number}? Status akan berubah menjadi "Menunggu" dan siap untuk ditugaskan.`
                : `Arsipkan faktur ${invoice.invoice_number}? Faktur akan ditandai selesai dan ditutup.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={loading}
            >
              Batal
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
              {action === "confirm" ? "Konfirmasi" : "Arsipkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Pembayaran */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Terima Pembayaran</DialogTitle>
            <DialogDescription>
              Catat pembayaran untuk faktur {invoice.invoice_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Faktur:</span>
                <span className="font-medium">
                  {formatCurrency(invoice.grand_total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sudah Dibayar:</span>
                <span className="font-medium">
                  {formatCurrency(invoice.amount_paid)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-muted-foreground font-medium">Sisa:</span>
                <span className="font-bold text-lg">
                  {formatCurrency(invoice.grand_total - invoice.amount_paid)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-amount">
                Nominal Pembayaran <span className="text-destructive">*</span>
              </Label>
              <Input
                id="payment-amount"
                type="number"
                min="0"
                max={invoice.grand_total - invoice.amount_paid}
                value={paymentAmount}
                onChange={(e) =>
                  setPaymentAmount(parseFloat(e.target.value) || 0)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tunai</SelectItem>
                  <SelectItem value="bank_transfer">Transfer Bank</SelectItem>
                  <SelectItem value="credit_card">Kartu Kredit</SelectItem>
                  <SelectItem value="debit_card">Kartu Debit</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="e_wallet">E-Wallet</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>No. Referensi (Opsional)</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="ID Transaksi, No. Cek, dll."
              />
            </div>

            <div className="space-y-2">
              <Label>Catatan (Opsional)</Label>
              <Textarea
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
              Batal
            </Button>
            <Button onClick={handleReceivePayment} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Catat Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Pembatalan */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Faktur</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin membatalkan faktur{" "}
              {invoice.invoice_number}? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">
                Alasan Pembatalan <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Jelaskan alasan pembatalan faktur ini..."
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
              Tidak Jadi
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelInvoice}
              disabled={loading || !cancelReason.trim()}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ya, Batalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

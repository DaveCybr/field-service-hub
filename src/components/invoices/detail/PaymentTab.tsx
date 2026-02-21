import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils/currency";
import {
  DollarSign,
  Receipt,
  Loader2,
  Check,
  FileText,
  Calendar,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { Invoice } from "@/hooks/invoices/useInvoiceDetail";
import { CurrencyInput } from "@/components/ui/currency-input";

interface PaymentRecord {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  employee_name?: string;
}

interface PaymentTabProps {
  invoice: Invoice;
  onPaymentRecorded: () => void;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Tunai",
  bank_transfer: "Transfer Bank",
  credit_card: "Kartu Kredit",
  debit_card: "Kartu Debit",
  qris: "QRIS",
  e_wallet: "E-Wallet",
  other: "Lainnya",
};

export function PaymentTab({ invoice, onPaymentRecorded }: PaymentTabProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ✅ FIX: Gunakan number, bukan string untuk amount
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const remainingBalance = invoice.grand_total - (invoice.amount_paid || 0);
  const isPaid = invoice.payment_status === "paid";

  useEffect(() => {
    fetchPayments();
  }, [invoice.id]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`*, employee:employees!audit_logs_employee_id_fkey (name)`)
        .eq("entity_type", "invoices")
        .eq("entity_id", invoice.id)
        .eq("action", "PAYMENT")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const paymentRecords: PaymentRecord[] = (data || []).map((log: any) => {
        const newData = log.new_data || {};
        return {
          id: log.id,
          amount: (newData.amount_paid || 0) - (log.old_data?.amount_paid || 0),
          payment_date: log.created_at,
          payment_method: newData.payment_method || "cash",
          reference_number: newData.payment_reference,
          notes: newData.payment_notes,
          employee_name: log.employee?.name,
        };
      });

      setPayments(paymentRecords);
    } catch (error: any) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!amount || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Nominal Tidak Valid",
        description: "Masukkan nominal pembayaran yang valid",
      });
      return;
    }
    if (!paymentMethod) {
      toast({
        variant: "destructive",
        title: "Metode Wajib Dipilih",
        description: "Pilih metode pembayaran terlebih dahulu",
      });
      return;
    }
    if (amount > remainingBalance) {
      toast({
        variant: "destructive",
        title: "Nominal Melebihi Sisa",
        description: `Pembayaran tidak boleh melebihi sisa tagihan ${formatCurrency(remainingBalance)}`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi tidak ditemukan");

      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const newAmountPaid = (invoice.amount_paid || 0) + amount;
      const newPaymentStatus =
        newAmountPaid >= invoice.grand_total
          ? "paid"
          : newAmountPaid > 0
            ? "partial"
            : "unpaid";

      const { error } = await supabase
        .from("invoices")
        .update({
          amount_paid: newAmountPaid,
          payment_status: newPaymentStatus,
          status: newPaymentStatus === "paid" ? "paid" : invoice.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      if (error) throw error;

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
          payment_reference: referenceNumber,
          payment_notes: notes,
        },
        employee_id: employee?.id || null,
      });

      toast({
        title: "Pembayaran Dicatat",
        description: `Pembayaran ${formatCurrency(amount)} berhasil dicatat`,
      });

      setAmount(0);
      setPaymentMethod("");
      setReferenceNumber("");
      setNotes("");

      await fetchPayments();
      onPaymentRecorded();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: error.message || "Gagal mencatat pembayaran",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const setQuickAmount = (percentage: number) => {
    setAmount(Math.round((remainingBalance * percentage) / 100));
  };

  return (
    <div className="space-y-6">
      {/* Ringkasan Pembayaran */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Ringkasan Pembayaran
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Faktur</p>
              <p className="text-2xl font-bold">
                {formatCurrency(invoice.grand_total)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sudah Dibayar</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(invoice.amount_paid || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sisa Tagihan</p>
              <p
                className={`text-2xl font-bold ${remainingBalance > 0 ? "text-destructive" : "text-emerald-600"}`}
              >
                {formatCurrency(remainingBalance)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-2">
                {isPaid ? (
                  <Badge variant="default" className="bg-emerald-600">
                    <Check className="h-3 w-3 mr-1" />
                    Lunas
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    {invoice.payment_status === "partial"
                      ? "Bayar Sebagian"
                      : "Belum Bayar"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Catat Pembayaran */}
      {!isPaid && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Catat Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Sisa yang Harus Dibayar
              </p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(remainingBalance)}
              </p>
            </div>

            {/* Tombol Cepat */}
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickAmount(25)}
              >
                25%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickAmount(50)}
              >
                50%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickAmount(75)}
              >
                75%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(remainingBalance)}
              >
                Bayar Penuh
              </Button>
            </div>

            <Separator />

            {/* ✅ FIX: Tidak duplikat label — CurrencyInput sudah ada label sendiri */}
            <CurrencyInput
              label="Nominal Pembayaran *"
              value={amount}
              onValueChange={(value) => setAmount(value || 0)}
              placeholder="Masukkan nominal"
              max={remainingBalance}
            />

            <div className="space-y-2">
              <Label>Metode Pembayaran *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih metode pembayaran" />
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
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="ID Transaksi, No. Cek, dll."
              />
            </div>

            <div className="space-y-2">
              <Label>Catatan (Opsional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleSubmitPayment}
              disabled={submitting || !amount || !paymentMethod}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan Pembayaran...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Catat Pembayaran {formatCurrency(amount || 0)}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Riwayat Pembayaran */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Riwayat Pembayaran
            {payments.length > 0 && (
              <Badge variant="secondary">{payments.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada riwayat pembayaran</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-lg">
                          {formatCurrency(payment.amount)}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(
                            new Date(payment.payment_date),
                            "dd MMMM yyyy, HH:mm",
                            { locale: localeId },
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {PAYMENT_METHOD_LABELS[payment.payment_method] ||
                          payment.payment_method}
                      </Badge>
                    </div>
                    {payment.employee_name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        Dicatat oleh {payment.employee_name}
                      </div>
                    )}
                    {payment.reference_number && (
                      <p className="text-sm text-muted-foreground">
                        Ref: {payment.reference_number}
                      </p>
                    )}
                    {payment.notes && (
                      <p className="text-sm text-muted-foreground">
                        {payment.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

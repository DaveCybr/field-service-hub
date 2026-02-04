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

export function PaymentTab({ invoice, onPaymentRecorded }: PaymentTabProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Payment form state
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
      // Fetch payment history from audit_logs
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`
          *,
          employee:employees!audit_logs_employee_id_fkey (name)
        `)
        .eq("entity_type", "invoices")
        .eq("entity_id", invoice.id)
        .eq("action", "PAYMENT")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform audit logs to payment records
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
      // Silently fail - payment history is optional
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!amount || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        variant: "destructive",
        title: "Missing Method",
        description: "Please select a payment method",
      });
      return;
    }

    if (amount > remainingBalance) {
      toast({
        variant: "destructive",
        title: "Amount Too High",
        description: `Payment amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`,
      });
      return;
    }

    setSubmitting(true);
    try {
      // Get current user and their employee record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get employee ID
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Calculate new payment status
      const newAmountPaid = (invoice.amount_paid || 0) + amount;
      const newPaymentStatus =
        newAmountPaid >= invoice.grand_total
          ? "paid"
          : newAmountPaid > 0
            ? "partial"
            : "unpaid";

      // Update invoice
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

      // Log to audit_logs
      await supabase.from("audit_logs").insert({
        entity_type: "invoices",
        entity_id: invoice.id,
        action: "PAYMENT",
        old_data: { amount_paid: invoice.amount_paid, payment_status: invoice.payment_status },
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
        title: "Payment Recorded",
        description: `Successfully recorded payment of ${formatCurrency(amount)}`,
      });

      // Reset form
      setAmount(0);
      setPaymentMethod("");
      setReferenceNumber("");
      setNotes("");

      // Refresh data
      await fetchPayments();
      onPaymentRecorded();
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to record payment",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const setQuickAmount = (percentage: number) => {
    const quickAmount = (remainingBalance * percentage) / 100;
    setAmount(Math.round(quickAmount));
  };

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Invoice Total</p>
              <p className="text-2xl font-bold">
                {formatCurrency(invoice.grand_total)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount Paid</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(invoice.amount_paid || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining Balance</p>
              <p className={`text-2xl font-bold ${remainingBalance > 0 ? "text-destructive" : "text-emerald-600"}`}>
                {formatCurrency(remainingBalance)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-2">
                {isPaid ? (
                  <Badge variant="default" className="bg-emerald-600">
                    <Check className="h-3 w-3 mr-1" />
                    Paid in Full
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    {invoice.payment_status === "partial" ? "Partially Paid" : "Unpaid"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Record Payment Form */}
      {!isPaid && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Record Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Amount Due Display */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Amount Due</p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(remainingBalance)}
              </p>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setQuickAmount(25)}>
                25%
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuickAmount(50)}>
                50%
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuickAmount(75)}>
                75%
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setAmount(remainingBalance)}>
                Full Amount
              </Button>
            </div>

            <Separator />

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <CurrencyInput
                label="amount"
                value={amount}
                onValueChange={(value) => setAmount(value || 0)}
                placeholder="Enter amount"
                max={remainingBalance}
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="method">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
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
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Transaction ID, Check #, etc."
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmitPayment}
              disabled={submitting || !amount || !paymentMethod}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording Payment...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Record Payment of {formatCurrency(amount || 0)}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payment History
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
              <p>No payment records yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-start gap-4 p-4 border rounded-lg">
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
                          {format(new Date(payment.payment_date), "PPP")}
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {payment.payment_method.replace("_", " ")}
                      </Badge>
                    </div>
                    {payment.employee_name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        Recorded by {payment.employee_name}
                      </div>
                    )}
                    {payment.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
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

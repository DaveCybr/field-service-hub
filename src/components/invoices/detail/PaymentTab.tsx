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
  Upload,
  Loader2,
  Check,
  FileText,
  Calendar,
  User,
  CreditCard,
  Image as ImageIcon,
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
  payment_proof_url?: string;
  notes?: string;
  status: string;
  processed_by?: string;
  employee?: {
    name: string;
  };
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
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>("");

  const remainingBalance = invoice.grand_total - (invoice.amount_paid || 0);
  const isPaid = invoice.payment_status === "paid";

  useEffect(() => {
    fetchPayments();
  }, [invoice.id]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoice_payments")
        .select(
          `
          *,
          employee:employees!invoice_payments_processed_by_fkey (
            name
          )
        `
        )
        .eq("invoice_id", invoice.id)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error("Error fetching payments:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load payment history",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProof = async (): Promise<string | null> => {
    if (!proofFile) return null;

    try {
      const fileExt = proofFile.name.split(".").pop();
      const fileName = `${invoice.id}-${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(filePath, proofFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("invoices").getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      console.error("Error uploading proof:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Failed to upload payment proof",
      });
      return null;
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
        description: `Payment amount cannot exceed remaining balance of ${formatCurrency(
          remainingBalance
        )}`,
      });
      return;
    }

    setSubmitting(true);
    try {
      // Upload proof if provided
      let proofUrl = null;
      if (proofFile) {
        proofUrl = await uploadProof();
      }

      // Get current user and their employee record
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get employee ID from user_id
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (empError) {
        console.warn("Employee not found, recording without processor");
      }

      // Insert payment record
      const { error } = await supabase.from("invoice_payments").insert({
        invoice_id: invoice.id,
        amount,
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        payment_proof_url: proofUrl,
        notes: notes || null,
        processed_by: employee?.id || null, // Use employee.id, not user.id
        status: "completed",
      });

      if (error) throw error;

      toast({
        title: "Payment Recorded",
        description: `Successfully recorded payment of ${formatCurrency(
          amount
        )}`,
      });

      // Reset form
      setAmount(0);
      setPaymentMethod("");
      setReferenceNumber("");
      setNotes("");
      setProofFile(null);
      setProofPreview("");

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
              <p
                className={`text-2xl font-bold ${
                  remainingBalance > 0 ? "text-destructive" : "text-emerald-600"
                }`}
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
                    Paid in Full
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    {invoice.payment_status === "partial"
                      ? "Partially Paid"
                      : "Unpaid"}
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

            {/* Payment Proof Upload */}
            <div className="space-y-2">
              <Label htmlFor="proof">Payment Proof (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="proof"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                {proofPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(proofPreview, "_blank")}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
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
                        <p className="text-sm text-muted-foreground capitalize">
                          {payment.payment_method.replace("_", " ")}
                        </p>
                      </div>
                      <Badge
                        variant={
                          payment.status === "completed"
                            ? "default"
                            : payment.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </div>

                    {payment.reference_number && (
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="h-3 w-3" />
                        <span className="text-muted-foreground">
                          Ref: {payment.reference_number}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3" />
                      <span className="text-muted-foreground">
                        {format(new Date(payment.payment_date), "PPP 'at' p")}
                      </span>
                    </div>

                    {payment.employee && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3 w-3" />
                        <span className="text-muted-foreground">
                          By {payment.employee.name}
                        </span>
                      </div>
                    )}

                    {payment.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {payment.notes}
                      </p>
                    )}

                    {payment.payment_proof_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(payment.payment_proof_url!, "_blank")
                        }
                      >
                        <ImageIcon className="h-3 w-3 mr-2" />
                        View Proof
                      </Button>
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

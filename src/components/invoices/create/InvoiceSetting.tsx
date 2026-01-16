import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";

interface InvoiceSettingsProps {
  discount: string;
  tax: string;
  notes: string;
  onDiscountChange: (value: string) => void;
  onTaxChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

export function InvoiceSettings({
  discount,
  tax,
  notes,
  onDiscountChange,
  onTaxChange,
  onNotesChange,
}: InvoiceSettingsProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Invoice Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <CurrencyInput
            label="Discount"
            value={parseFloat(discount) || 0}
            onValueChange={(value) => onDiscountChange(value.toString())}
            min={0}
            helperText="Diskon dalam rupiah"
          />
          <CurrencyInput
            label="Tax (PPN)"
            value={parseFloat(tax) || 0}
            onValueChange={(value) => onTaxChange(value.toString())}
            min={0}
            helperText="Pajak dalam rupiah"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Additional invoice notes..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// InvoiceSetting.tsx (create)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Pengaturan Faktur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CurrencyInput
          label="Diskon"
          value={parseFloat(discount) || 0}
          onValueChange={(value) => onDiscountChange(String(value || 0))}
          min={0}
        />
        <CurrencyInput
          label="Pajak (PPN)"
          value={parseFloat(tax) || 0}
          onValueChange={(value) => onTaxChange(String(value || 0))}
          min={0}
        />
        <div className="space-y-2">
          <Label>Catatan (Opsional)</Label>
          <Textarea
            placeholder="Catatan untuk pelanggan..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
}

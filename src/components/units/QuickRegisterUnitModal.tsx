import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package } from "lucide-react";

interface QuickRegisterUnitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName?: string;
  onUnitRegistered: (unitId: string) => void;
}

const UNIT_TYPES = [
  "AC Split",
  "AC Standing",
  "AC Cassette",
  "AC Central",
  "Kulkas",
  "Freezer",
  "Mesin Cuci",
  "Pengering",
  "TV",
  "Water Heater",
  "Dispenser",
  "Rice Cooker",
  "Microwave",
  "Kipas Angin",
  "Stabilizer",
  "UPS",
  "Lainnya",
];

const generateQRCode = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RT-${timestamp}-${random}`;
};

export function QuickRegisterUnitModal({
  open,
  onOpenChange,
  customerId,
  customerName,
  onUnitRegistered,
}: QuickRegisterUnitModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    unit_type: "",
    brand: "",
    model: "",
    serial_number: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ unit_type: "", brand: "", model: "", serial_number: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ✅ FIX: Cegah event submit bubble ke <form> parent di NewInvoice.tsx
    e.stopPropagation();

    if (!formData.unit_type) {
      toast({
        variant: "destructive",
        title: "Tipe Unit Wajib Diisi",
        description: "Pilih tipe unit terlebih dahulu",
      });
      return;
    }

    if (!formData.brand.trim()) {
      toast({
        variant: "destructive",
        title: "Merk Wajib Diisi",
        description: "Masukkan merk unit",
      });
      return;
    }

    setSubmitting(true);
    try {
      const qr_code = generateQRCode();

      // ✅ FIX: Pisah insert dan select — sama seperti CustomerQuickCreate.
      // .insert().select().single() bisa return RLS error palsu meski data tersimpan,
      // menyebabkan toast "Gagal" muncul duluan lalu "Berhasil" belakangan.
      const { error: insertError } = await supabase.from("units").insert([
        {
          qr_code,
          customer_id: customerId,
          unit_type: formData.unit_type,
          brand: formData.brand.trim(),
          model: formData.model.trim() || null,
          serial_number: formData.serial_number.trim() || null,
          status: "active",
        },
      ]);

      if (insertError) throw insertError;

      // Fetch unit yang baru saja dibuat berdasarkan qr_code (unique)
      const { data, error: selectError } = await supabase
        .from("units")
        .select("id, qr_code, unit_type, brand, model")
        .eq("qr_code", qr_code)
        .single();

      if (selectError) throw selectError;

      // ✅ Tutup dialog dan reset form DULU sebelum callback
      onOpenChange(false);
      resetForm();

      // Callback ke ServiceForm — parent akan refetch units lalu set selected
      onUnitRegistered(data.id);

      toast({
        title: "Unit Berhasil Didaftarkan",
        description: `${data.brand} ${data.unit_type} (${data.qr_code}) telah dipilih`,
      });
    } catch (error: any) {
      console.error("Error registering unit:", error);
      toast({
        variant: "destructive",
        title: "Gagal Mendaftarkan Unit",
        description:
          error.message || "Terjadi kesalahan saat mendaftarkan unit",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Daftarkan Unit Baru
          </DialogTitle>
          <DialogDescription>
            Daftarkan unit baru untuk{" "}
            <strong>{customerName || "pelanggan ini"}</strong>. Detail lengkap
            (kapasitas, garansi) dapat diisi nanti di halaman Unit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              Tipe Unit <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.unit_type}
              onValueChange={(v) => updateField("unit_type", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih tipe unit" />
              </SelectTrigger>
              <SelectContent>
                {UNIT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Merk <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.brand}
              onChange={(e) => updateField("brand", e.target.value)}
              placeholder="Contoh: Samsung, LG, Panasonic"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Model (Opsional)</Label>
            <Input
              value={formData.model}
              onChange={(e) => updateField("model", e.target.value)}
              placeholder="Contoh: Inverter 1.5 PK, 2 Pintu"
            />
          </div>

          <div className="space-y-2">
            <Label>No. Seri (Opsional)</Label>
            <Input
              value={formData.serial_number}
              onChange={(e) => updateField("serial_number", e.target.value)}
              placeholder="Nomor seri unit"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mendaftarkan...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Daftarkan & Pilih
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// FILE: src/components/units/RegisterUnitModal.tsx
// Modal register unit baru dari halaman Units
// ============================================
import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, RefreshCw } from "lucide-react";

interface RegisterUnitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedCustomerId?: string; // opsional, jika dibuka dari CustomerDetail
}

interface Customer {
  id: string;
  name: string;
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

const defaultForm = () => ({
  customer_id: "",
  unit_type: "",
  brand: "",
  model: "",
  serial_number: "",
  capacity: "",
  purchase_date: "",
  warranty_expiry_date: "",
  notes: "",
  qr_code: generateQRCode(),
});

export function RegisterUnitModal({
  open,
  onOpenChange,
  onSuccess,
  preselectedCustomerId,
}: RegisterUnitModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [formData, setFormData] = useState(defaultForm());

  useEffect(() => {
    if (open) {
      fetchCustomers();
      // Reset form setiap kali modal dibuka
      const fresh = defaultForm();
      if (preselectedCustomerId) {
        fresh.customer_id = preselectedCustomerId;
      }
      setFormData(fresh);
    }
  }, [open, preselectedCustomerId]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, name")
      .eq("blacklisted", false)
      .order("name");
    if (data) setCustomers(data);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const regenerateQR = () => {
    updateField("qr_code", generateQRCode());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_id) {
      toast({ variant: "destructive", title: "Customer wajib dipilih" });
      return;
    }
    if (!formData.unit_type) {
      toast({ variant: "destructive", title: "Tipe unit wajib dipilih" });
      return;
    }
    if (!formData.brand.trim()) {
      toast({ variant: "destructive", title: "Merk wajib diisi" });
      return;
    }
    if (!formData.qr_code.trim()) {
      toast({ variant: "destructive", title: "QR Code tidak boleh kosong" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("units").insert([
        {
          qr_code: formData.qr_code.trim(),
          customer_id: formData.customer_id,
          unit_type: formData.unit_type,
          brand: formData.brand.trim(),
          model: formData.model.trim() || null,
          serial_number: formData.serial_number.trim() || null,
          capacity: formData.capacity.trim() || null,
          purchase_date: formData.purchase_date || null,
          warranty_expiry_date: formData.warranty_expiry_date || null,
          notes: formData.notes.trim() || null,
          status: "active",
        },
      ]);

      if (error) {
        // QR code duplicate
        if (error.code === "23505") {
          toast({
            variant: "destructive",
            title: "QR Code sudah dipakai",
            description: "Generate ulang QR code dan coba lagi",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Unit Berhasil Didaftarkan",
        description: `${formData.brand} ${formData.unit_type} (${formData.qr_code})`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error registering unit:", error);
      toast({
        variant: "destructive",
        title: "Gagal Mendaftarkan Unit",
        description: error.message || "Terjadi kesalahan",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Daftarkan Unit Baru
          </DialogTitle>
          <DialogDescription>
            Isi informasi unit yang akan didaftarkan. Field bertanda{" "}
            <span className="text-destructive">*</span> wajib diisi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* QR Code */}
          <div className="space-y-2">
            <Label>
              QR Code <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                value={formData.qr_code}
                onChange={(e) => updateField("qr_code", e.target.value)}
                className="font-mono"
                placeholder="RT-XXXXX-XXXXXX"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={regenerateQR}
                title="Generate QR Code baru"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-generate atau edit manual. Harus unik.
            </p>
          </div>

          {/* Customer */}
          <div className="space-y-2">
            <Label>
              Customer <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.customer_id}
              onValueChange={(v) => updateField("customer_id", v)}
              disabled={!!preselectedCustomerId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipe Unit */}
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

          {/* Merk & Model */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Merk <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.brand}
                onChange={(e) => updateField("brand", e.target.value)}
                placeholder="Daikin, Samsung, LG..."
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={formData.model}
                onChange={(e) => updateField("model", e.target.value)}
                placeholder="FTV35BXV14..."
              />
            </div>
          </div>

          {/* Serial Number & Kapasitas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>No. Seri</Label>
              <Input
                value={formData.serial_number}
                onChange={(e) => updateField("serial_number", e.target.value)}
                placeholder="Nomor seri"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Kapasitas</Label>
              <Input
                value={formData.capacity}
                onChange={(e) => updateField("capacity", e.target.value)}
                placeholder="1.5 PK, 2 Pintu..."
              />
            </div>
          </div>

          {/* Tanggal Beli & Garansi */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Beli</Label>
              <Input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => updateField("purchase_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Garansi Sampai</Label>
              <Input
                type="date"
                value={formData.warranty_expiry_date}
                onChange={(e) =>
                  updateField("warranty_expiry_date", e.target.value)
                }
              />
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Catatan tambahan tentang unit ini..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
                  Daftarkan Unit
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

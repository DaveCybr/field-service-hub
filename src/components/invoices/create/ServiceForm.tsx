// ServiceForm.tsx (create)
import { useState } from "react";
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
import { CurrencyInput } from "@/components/ui/currency-input";
import { LocationPicker } from "@/components/jobs/LocationPicker";
import { MapPin, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QuickRegisterUnitModal } from "@/components/units/QuickRegisterUnitModal";
import type { ServiceItem, Unit } from "@/types/invoice";

interface ServiceFormProps {
  units: Unit[];
  customerId: string;
  customerName?: string;
  onSubmit: (service: Omit<ServiceItem, "id">) => void;
  onCancel: () => void;
  onUnitsRefresh?: () => Promise<void> | void;
}

export function ServiceForm({
  units,
  customerId,
  customerName,
  onSubmit,
  onCancel,
  onUnitsRefresh,
}: ServiceFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<ServiceItem>>({
    title: "",
    service_cost: 0,
    priority: "normal",
    estimated_duration: 60,
  });
  const [quickRegisterOpen, setQuickRegisterOpen] = useState(false);

  // ✅ FIX: Simpan unit baru secara optimistic di local state.
  // Tidak mengandalkan timing re-render parent setelah refetch —
  // unit langsung tampil di dropdown begitu didaftarkan.
  const [localUnits, setLocalUnits] = useState<Unit[]>([]);

  const handleSubmit = () => {
    if (!formData.title?.trim()) {
      toast({
        variant: "destructive",
        title: "Judul Wajib Diisi",
        description: "Masukkan judul layanan",
      });
      return;
    }
    onSubmit(formData as Omit<ServiceItem, "id">);
  };

  const updateField = (field: keyof ServiceItem, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUnitRegistered = async (unitId: string) => {
    // Fetch detail unit baru untuk ditampilkan di dropdown secara langsung
    try {
      const { data } = await supabase
        .from("units")
        .select("id, customer_id, unit_type, brand, model")
        .eq("id", unitId)
        .single();

      if (data) {
        // Tambahkan ke local list agar langsung muncul di dropdown
        setLocalUnits((prev) => [...prev, data as Unit]);
      }
    } catch {
      // Jika fetch gagal, tetap coba refetch parent
    }

    // Set unit yang baru sebagai selected
    updateField("unit_id", unitId);

    // Trigger refetch di background agar parent state juga sync
    if (onUnitsRefresh) onUnitsRefresh();
  };

  // Gabungkan units dari parent + localUnits, deduplikasi berdasarkan id
  const allUnits = [
    ...units,
    ...localUnits.filter((lu) => !units.some((u) => u.id === lu.id)),
  ];

  const customerUnits = allUnits.filter((unit) =>
    customerId ? unit.customer_id === customerId : false,
  );

  return (
    <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
      <div className="grid grid-cols-2 gap-4">
        {/* Judul Layanan */}
        <div className="col-span-2 space-y-2">
          <Label>
            Judul Layanan <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Contoh: Servis AC, Perawatan Kulkas"
            value={formData.title || ""}
            onChange={(e) => updateField("title", e.target.value)}
          />
        </div>

        {/* Deskripsi */}
        <div className="col-span-2 space-y-2">
          <Label>Deskripsi (Opsional)</Label>
          <Textarea
            placeholder="Deskripsi detail layanan..."
            value={formData.description || ""}
            onChange={(e) => updateField("description", e.target.value)}
            rows={2}
          />
        </div>

        {/* Pilih Unit */}
        <div className="space-y-2">
          <Label>Unit (Opsional)</Label>
          <div className="flex gap-2">
            <Select
              value={formData.unit_id || ""}
              onValueChange={(value) => updateField("unit_id", value)}
              disabled={!customerId}
            >
              <SelectTrigger className="flex-1">
                <SelectValue
                  placeholder={
                    !customerId
                      ? "Pilih pelanggan dulu"
                      : customerUnits.length === 0
                        ? "Belum ada unit"
                        : "Pilih unit"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {customerUnits.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                    Belum ada unit untuk pelanggan ini
                  </div>
                ) : (
                  customerUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.unit_type} - {unit.brand || "Merk Tidak Diketahui"}
                      {unit.model && ` (${unit.model})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {customerId && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuickRegisterOpen(true)}
                title="Daftarkan unit baru"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          {!customerId ? (
            <p className="text-xs text-muted-foreground">
              Pilih pelanggan terlebih dahulu
            </p>
          ) : customerUnits.length === 0 ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Plus className="h-3 w-3" />
              Klik + untuk mendaftarkan unit baru
            </p>
          ) : null}
        </div>

        {/* Biaya Layanan */}
        <CurrencyInput
          label="Biaya Layanan"
          value={formData.service_cost || 0}
          onValueChange={(value) => updateField("service_cost", value)}
          min={0}
          required
          helperText="Biaya jasa (tidak termasuk suku cadang)"
        />

        {/* Prioritas */}
        <div className="space-y-2">
          <Label>Prioritas</Label>
          <Select
            value={formData.priority || "normal"}
            onValueChange={(value) => updateField("priority", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Rendah</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">Tinggi</SelectItem>
              <SelectItem value="urgent">Mendesak</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Estimasi Durasi */}
        <div className="space-y-2">
          <Label>Estimasi Durasi (menit)</Label>
          <Input
            type="number"
            min="15"
            step="15"
            value={formData.estimated_duration || 60}
            onChange={(e) =>
              updateField("estimated_duration", parseInt(e.target.value) || 60)
            }
          />
        </div>

        {/* Jadwal */}
        <div className="space-y-2 col-span-2">
          <Label>Jadwal Layanan</Label>
          <Input
            type="datetime-local"
            value={formData.scheduled_date || ""}
            onChange={(e) => updateField("scheduled_date", e.target.value)}
          />
        </div>

        {/* Alamat */}
        <div className="col-span-2 space-y-2">
          <Label>Alamat Lokasi Layanan</Label>
          <Textarea
            placeholder="Masukkan alamat lokasi layanan"
            value={formData.service_address || ""}
            onChange={(e) => updateField("service_address", e.target.value)}
            rows={2}
          />
        </div>

        {/* GPS */}
        <div className="col-span-2 space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Lokasi GPS (untuk validasi check-in/out)
          </Label>
          <LocationPicker
            latitude={formData.service_latitude || null}
            longitude={formData.service_longitude || null}
            address={formData.service_address || ""}
            onLocationChange={(lat, lng) => {
              updateField("service_latitude", lat || undefined);
              updateField("service_longitude", lng || undefined);
            }}
            onAddressChange={(addr) => updateField("service_address", addr)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" onClick={handleSubmit} className="flex-1">
          Tambah Layanan
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Batal
        </Button>
      </div>

      <QuickRegisterUnitModal
        open={quickRegisterOpen}
        onOpenChange={setQuickRegisterOpen}
        customerId={customerId}
        customerName={customerName}
        onUnitRegistered={handleUnitRegistered}
      />
    </div>
  );
}

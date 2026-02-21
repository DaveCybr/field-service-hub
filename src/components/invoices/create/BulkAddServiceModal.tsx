// BulkAddServiceModal.tsx
// Pilih banyak unit sekaligus → otomatis generate service rows
// Khusus untuk kasus customer Project seperti sekolah dengan banyak unit/ruangan

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Search,
  CheckSquare,
  Square,
  Layers,
  Wrench,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { LocationPicker } from "@/components/jobs/LocationPicker";
import type { ServiceItem, Unit } from "@/types/invoice";
import { cn } from "@/lib/utils";

interface BulkAddServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: Unit[];
  customerId: string;
  customerAddress?: string;
  customerLat?: number | null; // GPS dari profil customer
  customerLng?: number | null;
  onAddServices: (services: Omit<ServiceItem, "id">[]) => void;
}

// Template jenis servis yang umum — bisa dipilih sebagai preset
const SERVICE_TEMPLATES = [
  { label: "Servis AC", defaultCost: 150000 },
  { label: "Isi Freon", defaultCost: 200000 },
  { label: "Cuci AC", defaultCost: 100000 },
  { label: "Servis + Isi Freon", defaultCost: 300000 },
  { label: "Perbaikan Kerusakan", defaultCost: 250000 },
  { label: "Pengecekan Rutin", defaultCost: 75000 },
  { label: "Instalasi Baru", defaultCost: 500000 },
  { label: "Custom...", defaultCost: 0 },
];

export function BulkAddServiceModal({
  open,
  onOpenChange,
  units,
  customerId,
  customerAddress,
  customerLat,
  customerLng,
  onAddServices,
}: BulkAddServiceModalProps) {
  const [search, setSearch] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(
    new Set(),
  );

  // Shared settings — berlaku untuk semua unit yang dipilih
  const [serviceTemplate, setServiceTemplate] = useState(
    SERVICE_TEMPLATES[0].label,
  );
  const [customTitle, setCustomTitle] = useState("");
  const [serviceCost, setServiceCost] = useState<number>(
    SERVICE_TEMPLATES[0].defaultCost,
  );
  const [priority, setPriority] = useState("normal");
  const [scheduledDate, setScheduledDate] = useState("");

  // Lokasi GPS — default dari profil customer, bisa di-override lewat LocationPicker
  const [serviceAddress, setServiceAddress] = useState("");
  const [serviceLat, setServiceLat] = useState<number | null>(null);
  const [serviceLng, setServiceLng] = useState<number | null>(null);

  // Reset saat modal dibuka
  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedUnitIds(new Set());
      setServiceTemplate(SERVICE_TEMPLATES[0].label);
      setCustomTitle("");
      setServiceCost(SERVICE_TEMPLATES[0].defaultCost);
      setPriority("normal");
      setScheduledDate("");
      // Auto-fill GPS dari profil customer — tidak perlu input manual lagi
      setServiceAddress(customerAddress || "");
      setServiceLat(customerLat ?? null);
      setServiceLng(customerLng ?? null);
    }
  }, [open, customerAddress, customerLat, customerLng]);

  // Update biaya otomatis saat ganti template
  const handleTemplateChange = (template: string) => {
    setServiceTemplate(template);
    const found = SERVICE_TEMPLATES.find((t) => t.label === template);
    if (found && found.defaultCost > 0) {
      setServiceCost(found.defaultCost);
    }
    if (template !== "Custom...") setCustomTitle("");
  };

  // Filter units berdasarkan search
  const customerUnits = useMemo(
    () => units.filter((u) => u.customer_id === customerId),
    [units, customerId],
  );

  const filteredUnits = useMemo(() => {
    if (!search.trim()) return customerUnits;
    const q = search.toLowerCase();
    return customerUnits.filter(
      (u) =>
        u.unit_type?.toLowerCase().includes(q) ||
        u.brand?.toLowerCase().includes(q) ||
        u.model?.toLowerCase().includes(q) ||
        u.qr_code?.toLowerCase().includes(q),
    );
  }, [customerUnits, search]);

  // Grouping unit berdasarkan unit_type (misal: "AC Split", "Kulkas", dst)
  const groupedUnits = useMemo(() => {
    const groups: Record<string, Unit[]> = {};
    filteredUnits.forEach((unit) => {
      const type = unit.unit_type || "Lainnya";
      if (!groups[type]) groups[type] = [];
      groups[type].push(unit);
    });
    return groups;
  }, [filteredUnits]);

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const toggleGroup = (groupUnits: Unit[]) => {
    const allSelected = groupUnits.every((u) => selectedUnitIds.has(u.id));
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      groupUnits.forEach((u) => {
        if (allSelected) next.delete(u.id);
        else next.add(u.id);
      });
      return next;
    });
  };

  const selectAll = () => {
    setSelectedUnitIds(new Set(filteredUnits.map((u) => u.id)));
  };

  const clearAll = () => {
    setSelectedUnitIds(new Set());
  };

  const effectiveTitle =
    serviceTemplate === "Custom..." ? customTitle : serviceTemplate;
  const totalEstimate = selectedUnitIds.size * serviceCost;

  const handleSubmit = () => {
    if (selectedUnitIds.size === 0) return;
    if (!effectiveTitle.trim()) return;

    const services: Omit<ServiceItem, "id">[] = [];

    selectedUnitIds.forEach((unitId) => {
      const unit = customerUnits.find((u) => u.id === unitId);
      if (!unit) return;

      // Label unit: brand + model jika ada, fallback ke QR code
      const unitLabel =
        [unit.brand, unit.model].filter(Boolean).join(" ") || unit.qr_code;

      services.push({
        title: `${effectiveTitle} — ${unitLabel}`,
        description: unit.qr_code ? `QR: ${unit.qr_code}` : undefined,
        unit_id: unitId,
        service_cost: serviceCost,
        parts_cost: 0,
        total_cost: serviceCost,
        priority,
        scheduled_date: scheduledDate || undefined,
        // Lokasi GPS dibagikan ke semua service
        service_address: serviceAddress || undefined,
        service_latitude: serviceLat || undefined,
        service_longitude: serviceLng || undefined,
        status: "pending",
      });
    });

    onAddServices(services);
    onOpenChange(false);
  };

  const isCustom = serviceTemplate === "Custom...";
  const canSubmit =
    selectedUnitIds.size > 0 && effectiveTitle.trim() && serviceCost >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[680px] flex flex-col gap-0 p-0 overflow-hidden"
        style={{ height: "90vh", maxHeight: "90vh" }}
      >
        {/* Header — fixed, tidak ikut scroll */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Tambah Layanan Massal
          </DialogTitle>
          <DialogDescription>
            Pilih unit yang akan diservis, lalu atur jenis servis. Setiap unit
            akan menjadi 1 baris layanan di faktur.
          </DialogDescription>
        </DialogHeader>

        {/* Konten — satu-satunya area yang scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* === BAGIAN ATAS: Pengaturan Servis === */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/40">
            <p className="text-sm font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Jenis Servis (berlaku untuk semua unit yang dipilih)
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Template Servis</Label>
                <Select
                  value={serviceTemplate}
                  onValueChange={handleTemplateChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TEMPLATES.map((t) => (
                      <SelectItem key={t.label} value={t.label}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{t.label}</span>
                          {t.defaultCost > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(t.defaultCost)}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <CurrencyInput
                label="Biaya per Unit"
                value={serviceCost}
                onValueChange={(v) => setServiceCost(v || 0)}
                min={0}
              />
            </div>

            {isCustom && (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Judul Servis Custom{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Contoh: Ganti Kapasitor"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Prioritas</Label>
                <Select value={priority} onValueChange={setPriority}>
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

              <div className="space-y-1.5">
                <Label className="text-xs">Jadwal (Opsional)</Label>
                <Input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
            </div>

            {/* Lokasi — 1 lokasi berlaku untuk semua service */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Lokasi Servis
              </Label>

              {customerLat && customerLng ? (
                // Customer sudah punya GPS di profil → tampilkan info, tidak perlu input
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-emerald-800">
                      GPS dari profil customer
                    </p>
                    <p className="text-xs text-emerald-600">
                      {customerLat.toFixed(6)}, {customerLng.toFixed(6)}
                    </p>
                    {customerAddress && (
                      <p className="text-xs text-emerald-600 truncate">
                        {customerAddress}
                      </p>
                    )}
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${customerLat},${customerLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-700 underline shrink-0"
                  >
                    Lihat →
                  </a>
                </div>
              ) : (
                // Customer belum punya GPS → tampilkan LocationPicker
                <>
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Customer belum punya GPS tersimpan. Atur lokasi sekarang
                    atau simpan di profil customer.
                  </p>
                  <LocationPicker
                    latitude={serviceLat}
                    longitude={serviceLng}
                    address={serviceAddress}
                    onLocationChange={(lat, lng) => {
                      setServiceLat(lat);
                      setServiceLng(lng);
                    }}
                    onAddressChange={setServiceAddress}
                  />
                </>
              )}

              {serviceLat && serviceLng && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Berlaku untuk semua{" "}
                  {selectedUnitIds.size > 0 ? `${selectedUnitIds.size} ` : ""}
                  layanan
                </p>
              )}
            </div>
          </div>

          {/* === BAGIAN BAWAH: Pilih Unit === */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Pilih Unit
                {selectedUnitIds.size > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedUnitIds.size} dipilih
                  </Badge>
                )}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  disabled={filteredUnits.length === 0}
                >
                  <CheckSquare className="h-3.5 w-3.5 mr-1" />
                  Pilih Semua
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  disabled={selectedUnitIds.size === 0}
                >
                  <Square className="h-3.5 w-3.5 mr-1" />
                  Hapus Pilihan
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari unit, merk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Unit list — tidak ada scroll sendiri, ikut scroll parent */}
            {customerUnits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">
                  Pelanggan ini belum memiliki unit terdaftar
                </p>
                <p className="text-xs mt-1">
                  Daftarkan unit terlebih dahulu di halaman Units
                </p>
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Tidak ada unit yang cocok dengan pencarian
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupedUnits).map(([unitType, groupUnits]) => {
                  const allGroupSelected = groupUnits.every((u) =>
                    selectedUnitIds.has(u.id),
                  );
                  const someGroupSelected = groupUnits.some((u) =>
                    selectedUnitIds.has(u.id),
                  );

                  return (
                    <div
                      key={unitType}
                      className="border rounded-lg overflow-hidden"
                    >
                      {/* Group header — div bukan button agar tidak nested button */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleGroup(groupUnits)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && toggleGroup(groupUnits)
                        }
                        className="w-full flex items-center gap-3 px-3 py-2 bg-muted/60 hover:bg-muted text-left transition-colors cursor-pointer select-none"
                      >
                        {/* Visual checkbox — bukan komponen Checkbox agar tidak ada button nested */}
                        <div
                          className={cn(
                            "h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
                            allGroupSelected
                              ? "bg-primary border-primary"
                              : someGroupSelected
                                ? "bg-primary/30 border-primary"
                                : "border-input bg-background",
                          )}
                        >
                          {allGroupSelected && (
                            <svg
                              className="h-2.5 w-2.5 text-primary-foreground"
                              fill="none"
                              viewBox="0 0 12 12"
                            >
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                          {someGroupSelected && !allGroupSelected && (
                            <div className="h-1.5 w-1.5 rounded-sm bg-primary" />
                          )}
                        </div>
                        <span className="text-sm font-medium flex-1">
                          {unitType}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {groupUnits.length} unit
                        </Badge>
                      </div>

                      {/* Units dalam group */}
                      <div className="divide-y">
                        {groupUnits.map((unit) => (
                          <label
                            key={unit.id}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={selectedUnitIds.has(unit.id)}
                              onCheckedChange={() => toggleUnit(unit.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {unit.brand} {unit.unit_type}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {[unit.model, unit.qr_code]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                            {selectedUnitIds.has(unit.id) && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                {formatCurrency(serviceCost)}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* end scrollable area */}

        {/* Footer — fixed di bawah, tidak ikut scroll */}
        <div className="border-t px-6 py-4 space-y-3 shrink-0 bg-background">
          {selectedUnitIds.size > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedUnitIds.size} unit × {formatCurrency(serviceCost)}
              </span>
              <span className="font-semibold text-primary">
                Estimasi Total: {formatCurrency(totalEstimate)}
              </span>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
              <Layers className="h-4 w-4 mr-2" />
              Tambah{" "}
              {selectedUnitIds.size > 0
                ? `${selectedUnitIds.size} Layanan`
                : "Layanan"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

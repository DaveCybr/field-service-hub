// ServiceSection.tsx (create) - Alert dipangkas, tidak terlalu verbose
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Layers, Users } from "lucide-react";
import { ServiceForm } from "./ServiceForm";
import { ServiceList } from "./ServiceList";
import { BulkAddServiceModal } from "./BulkAddServiceModal";
import type { ServiceItem, Unit, Technician } from "@/types/invoice";

interface ServicesSectionProps {
  services: ServiceItem[];
  units: Unit[];
  technicians: Technician[];
  customerId: string;
  customerName?: string;
  customerAddress?: string;
  customerLat?: number | null;
  customerLng?: number | null;
  onAddService: (service: Omit<ServiceItem, "id">) => void;
  onRemoveService: (id: string) => void;
  onRefreshUnits?: () => Promise<void> | void;
}

export function ServicesSection({
  services,
  units,
  technicians,
  customerId,
  customerName,
  customerAddress,
  customerLat,
  customerLng,
  onAddService,
  onRemoveService,
  onRefreshUnits,
}: ServicesSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const handleAddService = (service: Omit<ServiceItem, "id">) => {
    onAddService(service);
    setShowForm(false);
  };

  const handleBulkAdd = (newServices: Omit<ServiceItem, "id">[]) => {
    newServices.forEach((s) => onAddService(s));
  };

  // Tampilkan tombol Bulk Add hanya jika customer sudah dipilih dan punya unit
  const customerHasUnits =
    customerId && units.some((u) => u.customer_id === customerId);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Layanan</CardTitle>
            <CardDescription>
              Tambahkan layanan servis atau perawatan ke faktur ini
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {/* Tombol Bulk Add — muncul hanya jika customer punya unit terdaftar */}
            {customerHasUnits && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowBulk(true)}
                title="Tambah banyak layanan sekaligus berdasarkan unit"
              >
                <Layers className="h-4 w-4 mr-1" />
                Tambah Massal
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant={showForm ? "secondary" : "default"}
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Tambah Layanan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <ServiceForm
              units={units}
              customerId={customerId}
              customerName={customerName}
              onSubmit={handleAddService}
              onCancel={() => setShowForm(false)}
              onUnitsRefresh={onRefreshUnits}
            />
          )}

          <ServiceList services={services} onRemove={onRemoveService} />

          {services.length > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              Penugasan teknisi dapat dilakukan di tab <strong>
                Layanan
              </strong>{" "}
              setelah faktur dibuat.
            </p>
          )}
        </CardContent>
      </Card>

      <BulkAddServiceModal
        open={showBulk}
        onOpenChange={setShowBulk}
        units={units}
        customerId={customerId}
        customerAddress={customerAddress}
        customerLat={customerLat}
        customerLng={customerLng}
        onAddServices={handleBulkAdd}
      />
    </>
  );
}

// ServicesTab.tsx - Tab Layanan dengan status badge yang diperbaiki
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { MapPin, Wrench, Image as ImageIcon, Calendar } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils/currency";
import { ServiceTeamManager } from "@/components/technician/ServiceTeamManager";
import { useAuth } from "@/hooks/useAuth";

interface Service {
  id: string;
  service_title?: string;
  title?: string;
  description?: string;
  service_description?: string;
  service_cost: number;
  parts_cost: number;
  total_cost: number;
  scheduled_date?: string;
  service_address?: string;
  status?: string;
  before_photos?: string[];
  after_photos?: string[];
  notes?: string;
}

interface ServicesTabProps {
  services: Service[];
  invoiceId: string;
}

export function ServicesTab({ services, invoiceId }: ServicesTabProps) {
  const { employee } = useAuth();
  const canManage = employee?.role
    ? ["superadmin", "admin", "manager"].includes(employee.role)
    : false;

  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [photoType, setPhotoType] = useState<"before" | "after">("before");

  const openPhotos = (service: Service, type: "before" | "after") => {
    setSelectedPhotos(
      type === "before"
        ? service.before_photos || []
        : service.after_photos || [],
    );
    setPhotoType(type);
    setPhotoDialogOpen(true);
  };

  // ✅ FIX: Status badge yang dibedakan warnanya
  const getStatusBadge = (status?: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: {
        label: "Menunggu",
        className: "bg-yellow-100 text-yellow-800",
      },
      assigned: { label: "Ditugaskan", className: "bg-blue-100 text-blue-800" },
      in_progress: {
        label: "Sedang Dikerjakan",
        className: "bg-purple-100 text-purple-800",
      },
      completed: { label: "Selesai", className: "bg-green-100 text-green-800" },
      cancelled: { label: "Dibatalkan", className: "bg-red-100 text-red-800" },
    };
    const config = statusMap[status || "pending"] || statusMap.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="text-center">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Belum ada layanan dalam faktur ini</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {services.map((service, index) => (
          <div key={service.id} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {service.service_title ||
                        service.title ||
                        "Layanan Tanpa Judul"}
                    </CardTitle>
                    {(service.service_description || service.description) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {service.service_description || service.description}
                      </p>
                    )}
                  </div>
                  {service.status && getStatusBadge(service.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Biaya */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Biaya Layanan
                    </p>
                    <p className="font-semibold">
                      {formatCurrency(service.service_cost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Biaya Suku Cadang
                    </p>
                    <p className="font-semibold">
                      {formatCurrency(service.parts_cost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-semibold text-primary">
                      {formatCurrency(service.total_cost)}
                    </p>
                  </div>
                </div>

                {/* Jadwal & Lokasi */}
                {(service.scheduled_date || service.service_address) && (
                  <div className="space-y-2">
                    {service.scheduled_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(
                            new Date(service.scheduled_date),
                            "EEEE, dd MMMM yyyy 'pukul' HH:mm",
                            { locale: localeId },
                          )}
                        </span>
                      </div>
                    )}
                    {service.service_address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="flex-1">
                          {service.service_address}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Foto */}
                {((service.before_photos?.length || 0) > 0 ||
                  (service.after_photos?.length || 0) > 0) && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Foto Layanan</p>
                    <div className="flex gap-2">
                      {(service.before_photos?.length || 0) > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPhotos(service, "before")}
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Sebelum ({service.before_photos!.length})
                        </Button>
                      )}
                      {(service.after_photos?.length || 0) > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPhotos(service, "after")}
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Sesudah ({service.after_photos!.length})
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Catatan */}
                {service.notes && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Catatan</p>
                    <p className="text-sm text-muted-foreground">
                      {service.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manajemen Tim Teknisi */}
            <ServiceTeamManager
              invoiceId={invoiceId}
              serviceId={service.id}
              serviceName={
                service.service_title || service.title || "Layanan Tanpa Judul"
              }
              canManage={canManage}
              compact={false}
            />

            {index < services.length - 1 && <Separator className="my-6" />}
          </div>
        ))}
      </div>

      {/* Dialog Galeri Foto */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Foto {photoType === "before" ? "Sebelum" : "Sesudah"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {selectedPhotos.map((photo, index) => (
              <div
                key={index}
                className="relative aspect-video rounded-lg overflow-hidden"
              >
                <img
                  src={photo}
                  alt={`${photoType === "before" ? "Sebelum" : "Sesudah"} ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => window.open(photo, "_blank")}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

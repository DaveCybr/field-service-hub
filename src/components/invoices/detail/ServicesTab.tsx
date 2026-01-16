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
import {
  MapPin,
  Clock,
  User,
  Wrench,
  Image as ImageIcon,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";

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
  gps_location?: string;
  status?: string;
  assigned_technician?: string | { id: string; name: string };
  check_in_time?: string;
  check_out_time?: string;
  before_photos?: string[];
  after_photos?: string[];
  notes?: string;
}

interface ServicesTabProps {
  services: Service[];
}

export function ServicesTab({ services }: ServicesTabProps) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [photoType, setPhotoType] = useState<"before" | "after">("before");

  const openPhotos = (service: Service, type: "before" | "after") => {
    const photos =
      type === "before" ? service.before_photos : service.after_photos;
    setSelectedPhotos(photos || []);
    setPhotoType(type);
    setPhotoDialogOpen(true);
  };

  const getStatusBadge = (status?: string) => {
    const statusMap = {
      pending: { label: "Pending", variant: "secondary" as const },
      assigned: { label: "Assigned", variant: "default" as const },
      in_progress: { label: "In Progress", variant: "default" as const },
      completed: { label: "Completed", variant: "default" as const },
    };
    const config =
      statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateDuration = (checkIn?: string, checkOut?: string) => {
    if (!checkIn || !checkOut) return null;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="text-center">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No services in this invoice</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {services.map((service) => (
          <Card key={service.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {service.service_title ||
                      service.title ||
                      "Untitled Service"}
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
              {/* Costs */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Service Cost</p>
                  <p className="font-semibold">
                    {formatCurrency(service.service_cost)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Parts Cost</p>
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

              {/* Schedule & Location */}
              {(service.scheduled_date || service.service_address) && (
                <div className="space-y-2">
                  {service.scheduled_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(new Date(service.scheduled_date), "PPP 'at' p")}
                      </span>
                    </div>
                  )}
                  {service.service_address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="flex-1">{service.service_address}</span>
                      {service.gps_location && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const [lat, lng] = service.gps_location!.split(",");
                            window.open(
                              `https://www.google.com/maps?q=${lat},${lng}`,
                              "_blank"
                            );
                          }}
                        >
                          View Map
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Technician */}
              {service.assigned_technician && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Assigned to:{" "}
                    {typeof service.assigned_technician === "string"
                      ? service.assigned_technician
                      : service.assigned_technician.name || "Unknown"}
                  </span>
                </div>
              )}

              {/* Check-in/out */}
              {(service.check_in_time || service.check_out_time) && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  {service.check_in_time && (
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Check-in
                      </p>
                      <p className="font-medium">
                        {format(new Date(service.check_in_time), "p")}
                      </p>
                    </div>
                  )}
                  {service.check_out_time && (
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Check-out
                      </p>
                      <p className="font-medium">
                        {format(new Date(service.check_out_time), "p")}
                      </p>
                    </div>
                  )}
                  {service.check_in_time && service.check_out_time && (
                    <div className="col-span-2 pt-2 border-t">
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">
                        {calculateDuration(
                          service.check_in_time,
                          service.check_out_time
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Photos */}
              {((service.before_photos && service.before_photos.length > 0) ||
                (service.after_photos && service.after_photos.length > 0)) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Service Photos</p>
                  <div className="flex gap-2">
                    {service.before_photos &&
                      service.before_photos.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPhotos(service, "before")}
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Before ({service.before_photos.length})
                        </Button>
                      )}
                    {service.after_photos &&
                      service.after_photos.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPhotos(service, "after")}
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          After ({service.after_photos.length})
                        </Button>
                      )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {service.notes && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Notes</p>
                  <p className="text-sm text-muted-foreground">
                    {service.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Photo Gallery Dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {photoType === "before" ? "Before" : "After"} Photos
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
                  alt={`${photoType} ${index + 1}`}
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

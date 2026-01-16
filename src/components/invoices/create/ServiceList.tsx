import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import type { ServiceItem } from "@/types/invoice";

interface ServiceListProps {
  services: ServiceItem[];
  onRemove: (id: string) => void;
}

export function ServiceList({ services, onRemove }: ServiceListProps) {
  if (services.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No services added yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {services.map((service) => (
        <div
          key={service.id}
          className="flex items-start justify-between p-3 rounded-lg border bg-card"
        >
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{service.title}</p>
              <Badge variant="outline" className="text-xs">
                {service.priority}
              </Badge>
            </div>
            {service.description && (
              <p className="text-xs text-muted-foreground">
                {service.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{service.technician_id ? "Assigned" : "Unassigned"}</span>
              <span>•</span>
              <span>{formatCurrency(service.service_cost || 0)}</span>
              {service.scheduled_date && (
                <>
                  <span>•</span>
                  <span>{service.scheduled_date}</span>
                </>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(service.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ServiceForm } from "./ServiceForm";
import { ServiceList } from "./ServiceList";
import type { ServiceItem, Unit, Technician } from "@/types/invoice";

interface ServicesSectionProps {
  services: ServiceItem[];
  units: Unit[];
  technicians: Technician[];
  customerId: string;
  onAddService: (service: Omit<ServiceItem, "id">) => void;
  onRemoveService: (id: string) => void;
}

export function ServicesSection({
  services,
  units,
  technicians,
  customerId,
  onAddService,
  onRemoveService,
}: ServicesSectionProps) {
  const [showForm, setShowForm] = useState(false);

  const handleAddService = (service: Omit<ServiceItem, "id">) => {
    onAddService(service);
    setShowForm(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Services</CardTitle>
          <CardDescription>Add repair or maintenance services</CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant={showForm ? "secondary" : "default"}
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Service
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <ServiceForm
            units={units}
            technicians={technicians}
            customerId={customerId}
            onSubmit={handleAddService}
            onCancel={() => setShowForm(false)}
          />
        )}

        <ServiceList services={services} onRemove={onRemoveService} />
      </CardContent>
    </Card>
  );
}

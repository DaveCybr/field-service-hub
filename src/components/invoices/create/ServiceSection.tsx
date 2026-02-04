import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Users } from "lucide-react";
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
          <CardDescription>
            Add repair or maintenance services to this invoice
          </CardDescription>
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
        {/* Service Form */}
        {showForm && (
          <ServiceForm
            units={units}
            customerId={customerId}
            onSubmit={handleAddService}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Service List */}
        <ServiceList services={services} onRemove={onRemoveService} />

        {/* ⭐ INFO ALERT - Multi-Technician Assignment */}
        {services.length > 0 && (
          <Alert className="border-blue-200 bg-blue-50/50">
            <Users className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900 font-semibold text-sm">
              Multi-Technician Team Assignment
            </AlertTitle>
            <AlertDescription className="text-blue-800 text-xs space-y-2">
              <p>
                After creating this invoice, you can assign{" "}
                <strong>multiple technicians</strong> to each service with
                different roles in the <strong>Services tab</strong>:
              </p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>
                  <strong>Lead Technician</strong> - Team coordinator (1 per
                  service)
                </li>
                <li>
                  <strong>Senior Technician</strong> - Experienced specialist
                </li>
                <li>
                  <strong>Junior Technician</strong> - Mid-level support
                </li>
                <li>
                  <strong>Helper</strong> - Assistant
                </li>
              </ul>
              <p className="text-blue-700 pt-1">
                💡 <strong>Tip:</strong> You can manage team assignments after
                invoice creation
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

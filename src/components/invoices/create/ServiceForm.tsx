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
import { MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ServiceItem, Unit, Technician } from "@/types/invoice";

interface ServiceFormProps {
  units: Unit[];
  technicians: Technician[];
  customerId: string;
  onSubmit: (service: Omit<ServiceItem, "id">) => void;
  onCancel: () => void;
}

export function ServiceForm({
  units,
  technicians,
  customerId,
  onSubmit,
  onCancel,
}: ServiceFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<ServiceItem>>({
    title: "",
    service_cost: 0,
    priority: "normal",
    estimated_duration: 60,
  });

  const handleSubmit = () => {
    if (!formData.title?.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Service title is required",
      });
      return;
    }

    onSubmit(formData as Omit<ServiceItem, "id">);
  };

  const updateField = (field: keyof ServiceItem, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Filter units by selected customer
  const customerUnits = units.filter((unit) => {
    // Assuming units have a customer_id field
    return customerId ? true : false; // You may need to adjust this logic
  });

  return (
    <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
      <div className="grid grid-cols-2 gap-4">
        {/* Service Title */}
        <div className="col-span-2 space-y-2">
          <Label>Service Title *</Label>
          <Input
            placeholder="e.g., AC Repair"
            value={formData.title || ""}
            onChange={(e) => updateField("title", e.target.value)}
          />
        </div>

        {/* Description */}
        <div className="col-span-2 space-y-2">
          <Label>Description</Label>
          <Textarea
            placeholder="Service details..."
            value={formData.description || ""}
            onChange={(e) => updateField("description", e.target.value)}
            rows={2}
          />
        </div>

        {/* Unit Selection */}
        <div className="space-y-2">
          <Label>Unit (Optional)</Label>
          <Select
            value={formData.unit_id || ""}
            onValueChange={(value) => updateField("unit_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {customerUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.unit_type} - {unit.brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Technician Selection */}
        <div className="space-y-2">
          <Label>Technician</Label>
          <Select
            value={formData.technician_id || ""}
            onValueChange={(value) => updateField("technician_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select technician" />
            </SelectTrigger>
            <SelectContent>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Service Cost */}
        <CurrencyInput
          label="Service Cost"
          value={formData.service_cost || 0}
          onValueChange={(value) => updateField("service_cost", value)}
          min={0}
          required
          helperText="Biaya service (tanpa spare parts)"
        />

        {/* Priority */}
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={formData.priority || "normal"}
            onValueChange={(value) => updateField("priority", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Scheduled Date */}
        <div className="space-y-2">
          <Label>Scheduled Date</Label>
          <Input
            type="date"
            value={formData.scheduled_date || ""}
            onChange={(e) => updateField("scheduled_date", e.target.value)}
          />
        </div>

        {/* Estimated Duration */}
        <div className="space-y-2">
          <Label>Duration (minutes)</Label>
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

        {/* Service Address */}
        <div className="col-span-2 space-y-2">
          <Label>Service Address</Label>
          <Textarea
            placeholder="Enter service location address"
            value={formData.service_address || ""}
            onChange={(e) => updateField("service_address", e.target.value)}
            rows={2}
          />
        </div>

        {/* GPS Location Picker */}
        <div className="col-span-2 space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            GPS Location (for check-in/out validation)
          </Label>
          <LocationPicker
            latitude={formData.service_latitude || null}
            longitude={formData.service_longitude || null}
            address={formData.service_address || ""}
            onLocationChange={(lat, lng) => {
              updateField("service_latitude", lat || undefined);
              updateField("service_longitude", lng || undefined);
            }}
            onAddressChange={(addr) => {
              updateField("service_address", addr);
            }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button type="button" onClick={handleSubmit} className="flex-1">
          Add Service
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

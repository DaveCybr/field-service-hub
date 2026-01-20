import { useState, useEffect } from "react";
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
import { MapPin, AlertCircle, Sparkles, Plus } from "lucide-react";
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
  onUnitsRefresh?: () => void;
}

interface FreeTechnician {
  id: string;
  name: string;
  email: string;
  active_jobs_count: number;
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
  const [freeTechnicians, setFreeTechnicians] = useState<FreeTechnician[]>([]);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [quickRegisterOpen, setQuickRegisterOpen] = useState(false);

  // Fetch free technicians on mount
  useEffect(() => {
    fetchFreeTechnicians();
  }, []);

  const fetchFreeTechnicians = async () => {
    setLoadingTechs(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          id,
          name,
          email,
          active_jobs:invoice_services!assigned_technician_id(count)
        `,
        )
        .eq("role", "technician")
        .in("status", ["available", "off_duty"]);

      if (error) throw error;

      const techsWithWorkload = (data || []).map((tech: any) => ({
        id: tech.id,
        name: tech.name,
        email: tech.email,
        active_jobs_count: tech.active_jobs?.[0]?.count || 0,
      }));

      const freeTechs = techsWithWorkload.filter(
        (t) => t.active_jobs_count === 0,
      );
      setFreeTechnicians(freeTechs);
    } catch (error) {
      console.error("Error fetching technicians:", error);
    } finally {
      setLoadingTechs(false);
    }
  };

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

  const handleUnitRegistered = (unitId: string) => {
    // Auto-select the newly registered unit
    updateField("unit_id", unitId);

    // Refresh units list if callback provided
    if (onUnitsRefresh) {
      onUnitsRefresh();
    }

    toast({
      title: "Unit Selected",
      description: "The newly registered unit has been selected",
    });
  };

  // Filter units by selected customer
  const customerUnits = units.filter((unit) => {
    if (customerId) {
      return unit.customer_id === customerId;
    }
    return false;
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

        {/* Unit Selection with Quick Register */}
        <div className="space-y-2">
          <Label>Unit (Optional)</Label>
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
                      ? "Select customer first"
                      : customerUnits.length === 0
                        ? "No units found"
                        : "Select unit"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {customerUnits.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                    No units registered for this customer
                  </div>
                ) : (
                  customerUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.unit_type} - {unit.brand || "Unknown Brand"}
                      {unit.model && ` (${unit.model})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* Quick Register Button */}
            {customerId && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuickRegisterOpen(true)}
                title="Quick register unit"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Helper Text */}
          {!customerId ? (
            <p className="text-xs text-muted-foreground">
              Please select a customer first
            </p>
          ) : customerUnits.length === 0 ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Plus className="h-3 w-3" />
              No units found. Click + to register a new unit
            </p>
          ) : null}
        </div>

        {/* Technician Selection */}
        <div className="space-y-2">
          <Label>Technician Assignment</Label>
          <Select
            value={formData.technician_id || "auto"}
            onValueChange={(value) =>
              updateField("technician_id", value === "auto" ? null : value)
            }
            disabled={loadingTechs}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={loadingTechs ? "Loading..." : "Select technician"}
              />
            </SelectTrigger>
            <SelectContent>
              {/* Auto-Assign Option */}
              <SelectItem value="auto">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">Auto-Assign (Recommended)</span>
                </div>
              </SelectItem>

              {/* Free Technicians */}
              {freeTechnicians.length > 0 ? (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Available Technicians
                  </div>
                  {freeTechnicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span>{tech.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </>
              ) : (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  No available technicians. Will auto-assign when one becomes
                  free.
                </div>
              )}
            </SelectContent>
          </Select>

          {/* Helper Text */}
          {formData.technician_id === null && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              System will auto-assign to next available technician
            </p>
          )}

          {freeTechnicians.length === 0 && (
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                All technicians are currently busy. Job will be pending until a
                technician becomes available.
              </span>
            </div>
          )}
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
            type="datetime-local"
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

      {/* Quick Register Modal */}
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

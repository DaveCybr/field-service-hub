import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface EditUnitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: {
    id: string;
    qr_code: string;
    customer_id: string;
    unit_type: string;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    capacity: string | null;
    warranty_expiry_date: string | null;
  } | null;
  customers: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

const UNIT_TYPES = [
  "AC Split",
  "AC Standing",
  "AC Cassette",
  "AC Central",
  "Refrigerator",
  "Freezer",
  "Washing Machine",
  "Dryer",
  "Water Heater",
  "Stabilizer",
  "UPS",
  "Other",
];

export function EditUnitModal({
  open,
  onOpenChange,
  unit,
  customers,
  onSuccess,
}: EditUnitModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: "",
    unit_type: "",
    brand: "",
    model: "",
    serial_number: "",
    capacity: "",
    warranty_expiry_date: "",
  });

  // Load unit data when modal opens
  useEffect(() => {
    if (unit) {
      setFormData({
        customer_id: unit.customer_id || "",
        unit_type: unit.unit_type || "",
        brand: unit.brand || "",
        model: unit.model || "",
        serial_number: unit.serial_number || "",
        capacity: unit.capacity || "",
        warranty_expiry_date: unit.warranty_expiry_date || "",
      });
    }
  }, [unit]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!unit) return;

    // Validation
    if (!formData.customer_id || !formData.unit_type) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Customer and unit type are required",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("units")
        .update({
          customer_id: formData.customer_id,
          unit_type: formData.unit_type,
          brand: formData.brand || null,
          model: formData.model || null,
          serial_number: formData.serial_number || null,
          capacity: formData.capacity || null,
          warranty_expiry_date: formData.warranty_expiry_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", unit.id);

      if (error) throw error;

      toast({
        title: "Unit Updated",
        description: `${formData.unit_type} information has been updated successfully`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error updating unit:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update unit",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!unit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Unit</DialogTitle>
          <DialogDescription>
            Update unit information for {unit.qr_code}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* QR Code (Read-only) */}
          <div className="space-y-2">
            <Label>QR Code</Label>
            <Input
              value={unit.qr_code}
              disabled
              className="font-mono bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              QR code cannot be changed
            </p>
          </div>

          {/* Customer */}
          <div className="space-y-2">
            <Label htmlFor="customer">
              Customer <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.customer_id}
              onValueChange={(value) => updateField("customer_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit Type */}
          <div className="space-y-2">
            <Label htmlFor="unit_type">
              Unit Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.unit_type}
              onValueChange={(value) => updateField("unit_type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {UNIT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand & Model */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                placeholder="e.g., Daikin"
                value={formData.brand}
                onChange={(e) => updateField("brand", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                placeholder="e.g., FTV35BXV14"
                value={formData.model}
                onChange={(e) => updateField("model", e.target.value)}
              />
            </div>
          </div>

          {/* Serial Number & Capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serial">Serial Number</Label>
              <Input
                id="serial"
                placeholder="Serial number"
                value={formData.serial_number}
                onChange={(e) => updateField("serial_number", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                placeholder="e.g., 1.5 PK"
                value={formData.capacity}
                onChange={(e) => updateField("capacity", e.target.value)}
              />
            </div>
          </div>

          {/* Warranty Expiry */}
          <div className="space-y-2">
            <Label htmlFor="warranty">Warranty Expiry</Label>
            <Input
              id="warranty"
              type="date"
              value={formData.warranty_expiry_date}
              onChange={(e) =>
                updateField("warranty_expiry_date", e.target.value)
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

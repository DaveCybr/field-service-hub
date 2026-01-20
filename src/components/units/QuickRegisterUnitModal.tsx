import { useState } from "react";
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
import { Loader2, Package } from "lucide-react";

interface QuickRegisterUnitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName?: string;
  onUnitRegistered: (unitId: string) => void;
}

// ✅ MATCHED: Same unit types as your Units page
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

export function QuickRegisterUnitModal({
  open,
  onOpenChange,
  customerId,
  customerName,
  onUnitRegistered,
}: QuickRegisterUnitModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    unit_type: "",
    brand: "",
    model: "",
    serial_number: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ✅ MATCHED: Same QR generation as your Units page
  const generateQRCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RT-${timestamp}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.unit_type || !formData.brand) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Unit type and brand are required",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Generate QR code
      const qrCode = generateQRCode();

      // ✅ MATCHED: Same insert structure as your Units page
      const { data: unit, error } = await supabase
        .from("units")
        .insert([
          {
            qr_code: qrCode,
            customer_id: customerId,
            unit_type: formData.unit_type,
            brand: formData.brand || null,
            model: formData.model || null,
            serial_number: formData.serial_number || null,
            // Note: capacity and warranty_expiry_date can be added later
            // from the main Units page for full registration
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Unit Registered",
        description: `${formData.brand} ${formData.unit_type} registered with QR: ${qrCode}`,
      });

      // Reset form
      setFormData({
        unit_type: "",
        brand: "",
        model: "",
        serial_number: "",
      });

      // Close modal
      onOpenChange(false);

      // Notify parent component
      onUnitRegistered(unit.id);
    } catch (error: any) {
      console.error("Error registering unit:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to register unit",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      unit_type: "",
      brand: "",
      model: "",
      serial_number: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Quick Register Unit
          </DialogTitle>
          <DialogDescription>
            Register a new unit for {customerName || "this customer"}. The unit
            will be automatically selected. Add more details (capacity,
            warranty) later from Units page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Unit Type */}
          <div className="space-y-2">
            <Label htmlFor="unit_type">
              Unit Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.unit_type}
              onValueChange={(value) => updateField("unit_type", value)}
              required
            >
              <SelectTrigger id="unit_type">
                <SelectValue placeholder="Select unit type" />
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

          {/* Brand */}
          <div className="space-y-2">
            <Label htmlFor="brand">
              Brand <span className="text-destructive">*</span>
            </Label>
            <Input
              id="brand"
              placeholder="e.g., Daikin, Gree, Samsung"
              value={formData.brand}
              onChange={(e) => updateField("brand", e.target.value)}
              required
            />
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model">Model (Optional)</Label>
            <Input
              id="model"
              placeholder="e.g., FTV35BXV14"
              value={formData.model}
              onChange={(e) => updateField("model", e.target.value)}
            />
          </div>

          {/* Serial Number */}
          <div className="space-y-2">
            <Label htmlFor="serial_number">Serial Number (Optional)</Label>
            <Input
              id="serial_number"
              placeholder="e.g., SN-ABC123"
              value={formData.serial_number}
              onChange={(e) => updateField("serial_number", e.target.value)}
            />
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <p className="font-medium mb-1">Quick Registration</p>
            <p className="text-xs">
              • QR code format:{" "}
              <span className="font-mono">
                RT-{"{timestamp}"}-{"{random}"}
              </span>
              <br />
              • Additional details (capacity, warranty) can be added later
              <br />• Go to Units page for full registration options
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register & Select"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

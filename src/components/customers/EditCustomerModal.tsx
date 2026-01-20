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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface EditCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    category: "retail" | "project";
    payment_terms_days: number;
    blacklisted: boolean;
  } | null;
  onSuccess: () => void;
}

export function EditCustomerModal({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: EditCustomerModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    category: "retail" as "retail" | "project",
    payment_terms_days: "0",
    blacklisted: false,
  });

  // Load customer data when modal opens
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || "",
        address: customer.address || "",
        category: customer.category,
        payment_terms_days: customer.payment_terms_days.toString(),
        blacklisted: customer.blacklisted,
      });
    }
  }, [customer]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customer) return;

    // Validation
    if (!formData.name || !formData.phone) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Name and phone are required",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("customers")
        .update({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          address: formData.address || null,
          category: formData.category,
          payment_terms_days: parseInt(formData.payment_terms_days) || 0,
          blacklisted: formData.blacklisted,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customer.id);

      if (error) throw error;

      toast({
        title: "Customer Updated",
        description: `${formData.name} information has been updated successfully`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error updating customer:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update customer",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>Update customer information</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Customer name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              placeholder="+62 812 3456 7890"
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="customer@example.com"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="Customer address"
              value={formData.address}
              onChange={(e) => updateField("address", e.target.value)}
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value: "retail" | "project") =>
                updateField("category", value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="project">Project</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Terms (only for project) */}
          {formData.category === "project" && (
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Payment Terms (days)</Label>
              <Select
                value={formData.payment_terms_days}
                onValueChange={(value) =>
                  updateField("payment_terms_days", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Cash</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Blacklist Status */}
          <div className="space-y-2">
            <Label htmlFor="blacklisted">Status</Label>
            <Select
              value={formData.blacklisted ? "blacklisted" : "active"}
              onValueChange={(value) =>
                updateField("blacklisted", value === "blacklisted")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
            {formData.blacklisted && (
              <p className="text-xs text-destructive">
                ⚠️ Blacklisted customers cannot create new invoices
              </p>
            )}
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

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerQuickCreate } from "@/components/invoices/CustomerQuickCreate";
import { User, Plus } from "lucide-react";

interface Customer {
  id: string;
  name: string;
}

interface CustomerSectionProps {
  customers: Customer[];
  selectedCustomer: string;
  onCustomerChange: (customerId: string) => void;
  onCustomerCreated?: (customerId: string, customerName: string) => void;
}

export function CustomerSection({
  customers,
  selectedCustomer,
  onCustomerChange,
  onCustomerCreated,
}: CustomerSectionProps) {
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  const handleCustomerCreated = (customerId: string, customerName: string) => {
    onCustomerChange(customerId);
    if (onCustomerCreated) {
      onCustomerCreated(customerId, customerName);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="customer">
              Customer <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Select
                value={selectedCustomer}
                onValueChange={onCustomerChange}
                required
              >
                <SelectTrigger className="flex-1">
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuickCreateOpen(true)}
                title="Create new customer"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CustomerQuickCreate
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        onCustomerCreated={handleCustomerCreated}
      />
    </>
  );
}

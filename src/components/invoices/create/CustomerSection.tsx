// CustomerSection.tsx
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
  onRefreshCustomers?: () => Promise<void> | void;
}

export function CustomerSection({
  customers,
  selectedCustomer,
  onCustomerChange,
  onRefreshCustomers,
}: CustomerSectionProps) {
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  // ✅ FIX: Simpan customer baru secara optimistic — langsung muncul di dropdown
  // tanpa menunggu timing re-render parent setelah refetch
  const [localCustomers, setLocalCustomers] = useState<Customer[]>([]);

  const handleCustomerCreated = async (
    customerId: string,
    customerName: string,
  ) => {
    // Tambahkan ke local list agar langsung tampil di Select
    setLocalCustomers((prev) => {
      if (prev.some((c) => c.id === customerId)) return prev;
      return [...prev, { id: customerId, name: customerName }];
    });

    // Set sebagai selected langsung
    onCustomerChange(customerId);

    // Refetch di background agar parent state juga sync
    if (onRefreshCustomers) onRefreshCustomers();
  };

  // Gabungkan customers dari parent + localCustomers, deduplikasi
  const allCustomers = [
    ...customers,
    ...localCustomers.filter((lc) => !customers.some((c) => c.id === lc.id)),
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informasi Pelanggan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="customer">
              Pelanggan <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Select
                value={selectedCustomer}
                onValueChange={onCustomerChange}
                required
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pilih pelanggan" />
                </SelectTrigger>
                <SelectContent>
                  {allCustomers.map((customer) => (
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
                title="Tambah pelanggan baru"
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

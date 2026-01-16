import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal } from "lucide-react";

interface AdvancedFilters {
  minAmount?: number;
  maxAmount?: number;
  customerId?: string;
}

interface AdvancedFiltersPopoverProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  customers: Array<{ id: string; name: string }>;
}

export function AdvancedFiltersPopover({
  filters,
  onFiltersChange,
  customers,
}: AdvancedFiltersPopoverProps) {
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
  };

  const handleClear = () => {
    const cleared = {
      minAmount: undefined,
      maxAmount: undefined,
      customerId: undefined,
    };
    setLocalFilters(cleared);
    onFiltersChange(cleared);
  };

  const hasActiveFilters =
    filters.minAmount !== undefined ||
    filters.maxAmount !== undefined ||
    filters.customerId !== undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Advanced
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full text-[10px] text-primary-foreground flex items-center justify-center">
              {
                [
                  filters.minAmount,
                  filters.maxAmount,
                  filters.customerId,
                ].filter(Boolean).length
              }
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-3">Advanced Filters</h4>
          </div>

          {/* Amount Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Amount Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label
                  htmlFor="minAmount"
                  className="text-xs text-muted-foreground"
                >
                  Min Amount
                </Label>
                <Input
                  id="minAmount"
                  type="number"
                  placeholder="0"
                  value={localFilters.minAmount || ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      minAmount: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="maxAmount"
                  className="text-xs text-muted-foreground"
                >
                  Max Amount
                </Label>
                <Input
                  id="maxAmount"
                  type="number"
                  placeholder="999999999"
                  value={localFilters.maxAmount || ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      maxAmount: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Customer Filter */}
          <div className="space-y-2">
            <Label htmlFor="customer" className="text-sm font-medium">
              Customer
            </Label>
            <Select
              value={localFilters.customerId || "all"}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  customerId: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="flex-1"
            >
              Clear
            </Button>
            <Button size="sm" onClick={handleApply} className="flex-1">
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

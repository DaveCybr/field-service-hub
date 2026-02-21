import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { AdvancedFiltersPopover } from "./AdvancedFiltersPopover";

export interface InvoiceFilters {
  search: string;
  status: string;
  paymentStatus: string;
  dateRange: DateRange | undefined;
  minAmount?: number;
  maxAmount?: number;
  customerId?: string;
}

interface InvoiceFiltersBarProps {
  filters: InvoiceFilters;
  onFiltersChange: (filters: InvoiceFilters) => void;
  onClearFilters: () => void;
  customers: Array<{ id: string; name: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Menunggu",
  assigned: "Ditugaskan",
  in_progress: "Sedang Dikerjakan",
  completed: "Selesai",
  paid: "Lunas",
  cancelled: "Dibatalkan",
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Belum Bayar",
  partial: "Bayar Sebagian",
  paid: "Lunas",
};

export function InvoiceFiltersBar({
  filters,
  onFiltersChange,
  onClearFilters,
  customers,
}: InvoiceFiltersBarProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    filters.dateRange,
  );

  const updateFilter = (key: keyof InvoiceFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.search ||
    filters.status !== "all" ||
    filters.paymentStatus !== "all" ||
    filters.dateRange;

  const activeFilterCount = [
    filters.search,
    filters.status !== "all" ? filters.status : null,
    filters.paymentStatus !== "all" ? filters.paymentStatus : null,
    filters.dateRange ? "date" : null,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Baris Filter Utama */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Pencarian */}
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari no. faktur atau pelanggan..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Status */}
        <Select
          value={filters.status}
          onValueChange={(value) => updateFilter("status", value)}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Menunggu</SelectItem>
            <SelectItem value="in_progress">Sedang Dikerjakan</SelectItem>
            <SelectItem value="completed">Selesai</SelectItem>
            <SelectItem value="paid">Lunas</SelectItem>
            <SelectItem value="cancelled">Dibatalkan</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter Status Pembayaran */}
        <Select
          value={filters.paymentStatus}
          onValueChange={(value) => updateFilter("paymentStatus", value)}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Pembayaran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Pembayaran</SelectItem>
            <SelectItem value="unpaid">Belum Bayar</SelectItem>
            <SelectItem value="partial">Bayar Sebagian</SelectItem>
            <SelectItem value="paid">Lunas</SelectItem>
          </SelectContent>
        </Select>

        {/* Pilih Rentang Tanggal */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full md:w-[280px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd MMM yyyy", {
                      locale: localeId,
                    })}{" "}
                    -{" "}
                    {format(dateRange.to, "dd MMM yyyy", { locale: localeId })}
                  </>
                ) : (
                  format(dateRange.from, "dd MMM yyyy", { locale: localeId })
                )
              ) : (
                <span>Pilih rentang tanggal</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range);
                updateFilter("dateRange", range);
              }}
              numberOfMonths={2}
              locale={localeId}
            />
          </PopoverContent>
        </Popover>

        <AdvancedFiltersPopover
          filters={{
            minAmount: filters.minAmount,
            maxAmount: filters.maxAmount,
            customerId: filters.customerId,
          }}
          onFiltersChange={(advancedFilters) => {
            onFiltersChange({ ...filters, ...advancedFilters });
          }}
          customers={customers}
        />

        {/* Hapus Filter */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="shrink-0"
          >
            <X className="mr-2 h-4 w-4" />
            Hapus Filter
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* Tampilan Filter Aktif */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Cari: {filters.search}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("search", "")}
              />
            </Badge>
          )}
          {filters.status !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {STATUS_LABELS[filters.status] || filters.status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("status", "all")}
              />
            </Badge>
          )}
          {filters.paymentStatus !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Pembayaran:{" "}
              {PAYMENT_LABELS[filters.paymentStatus] || filters.paymentStatus}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("paymentStatus", "all")}
              />
            </Badge>
          )}
          {filters.dateRange && (
            <Badge variant="secondary" className="gap-1">
              Tanggal:{" "}
              {format(filters.dateRange.from!, "dd MMM", { locale: localeId })}{" "}
              -{" "}
              {filters.dateRange.to &&
                format(filters.dateRange.to, "dd MMM", { locale: localeId })}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("dateRange", undefined)}
              />
            </Badge>
          )}
          {filters.minAmount !== undefined && (
            <Badge variant="secondary" className="gap-1">
              Min: Rp {filters.minAmount.toLocaleString("id-ID")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  onFiltersChange({ ...filters, minAmount: undefined })
                }
              />
            </Badge>
          )}
          {filters.maxAmount !== undefined && (
            <Badge variant="secondary" className="gap-1">
              Maks: Rp {filters.maxAmount.toLocaleString("id-ID")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  onFiltersChange({ ...filters, maxAmount: undefined })
                }
              />
            </Badge>
          )}
          {filters.customerId && (
            <Badge variant="secondary" className="gap-1">
              Pelanggan:{" "}
              {customers.find((c) => c.id === filters.customerId)?.name}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  onFiltersChange({ ...filters, customerId: undefined })
                }
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

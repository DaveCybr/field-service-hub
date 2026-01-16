import { useState, useEffect } from "react";
import { replace, useSearchParams } from "react-router-dom";
import { DateRange } from "react-day-picker";
import { InvoiceFilters } from "@/components/invoices/InvoiceFiltersBar";

const DEFAULT_FILTERS: InvoiceFilters = {
  search: "",
  status: "all",
  paymentStatus: "all",
  dateRange: undefined,
  minAmount: undefined,
  maxAmount: undefined,
  customerId: undefined,
};

/**
 * Custom hook for persisting invoice filters in URL query params
 * Filters persist across navigation and page refreshes
 */
export function useInvoiceFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<InvoiceFilters>(() => {
    // Initialize from URL on mount
    return readFiltersFromURL(searchParams);
  });

  // Sync URL whenever filters change
  useEffect(() => {
    writeFiltersToURL(filters, setSearchParams);
  }, [filters, setSearchParams]);

  const updateFilters = (newFilters: InvoiceFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return {
    filters,
    updateFilters,
    clearFilters,
  };
}

/**
 * Read filters from URL query params
 */
function readFiltersFromURL(searchParams: URLSearchParams): InvoiceFilters {
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";
  const paymentStatus = searchParams.get("payment") || "all";

  let dateRange: DateRange | undefined = undefined;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (dateFrom) {
    dateRange = {
      from: new Date(dateFrom),
      to: dateTo ? new Date(dateTo) : undefined,
    };
  }

  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");
  const customerId = searchParams.get("customerId");

  return {
    search,
    status,
    paymentStatus,
    dateRange,
    minAmount: minAmount ? parseFloat(minAmount) : undefined,
    maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
    customerId: customerId || undefined,
  };
}

/**
 * Write filters to URL query params
 */
function writeFiltersToURL(
  filters: InvoiceFilters,
  setSearchParams: (
    params: URLSearchParams,
    options?: { replace?: boolean }
  ) => void
) {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.paymentStatus !== "all")
    params.set("payment", filters.paymentStatus);

  if (filters.dateRange?.from) {
    params.set("dateFrom", filters.dateRange.from.toISOString().split("T")[0]);
    if (filters.dateRange.to) {
      params.set("dateTo", filters.dateRange.to.toISOString().split("T")[0]);
    }
  }

  if (filters.minAmount !== undefined) {
    params.set("minAmount", filters.minAmount.toString());
  }
  if (filters.maxAmount !== undefined) {
    params.set("maxAmount", filters.maxAmount.toString());
  }
  if (filters.customerId) {
    params.set("customerId", filters.customerId);
  }

  setSearchParams(params, { replace: true });
}

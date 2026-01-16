import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { InvoiceFilters } from "@/components/invoices/InvoiceFiltersBar";

const STORAGE_KEY = "invoice_filters";

const DEFAULT_FILTERS: InvoiceFilters = {
  search: "",
  status: "all",
  paymentStatus: "all",
  dateRange: undefined,
};

/**
 * Alternative hook for persisting invoice filters in localStorage
 * Use this if you prefer localStorage over URL params
 */
export function useInvoiceFiltersLocalStorage() {
  const [filters, setFilters] = useState<InvoiceFilters>(() => {
    // Initialize from localStorage on mount
    return readFiltersFromStorage();
  });

  // Sync localStorage whenever filters change
  useEffect(() => {
    writeFiltersToStorage(filters);
  }, [filters]);

  const updateFilters = (newFilters: InvoiceFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    filters,
    updateFilters,
    clearFilters,
  };
}

/**
 * Read filters from localStorage
 */
function readFiltersFromStorage(): InvoiceFilters {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_FILTERS;

    const parsed = JSON.parse(stored);

    // Reconstruct date objects
    if (parsed.dateRange?.from) {
      parsed.dateRange.from = new Date(parsed.dateRange.from);
      if (parsed.dateRange.to) {
        parsed.dateRange.to = new Date(parsed.dateRange.to);
      }
    }

    return {
      ...DEFAULT_FILTERS,
      ...parsed,
    };
  } catch (error) {
    console.error("Error reading filters from storage:", error);
    return DEFAULT_FILTERS;
  }
}

/**
 * Write filters to localStorage
 */
function writeFiltersToStorage(filters: InvoiceFilters) {
  try {
    // Only store non-default values
    const toStore: any = {};

    if (filters.search) toStore.search = filters.search;
    if (filters.status !== "all") toStore.status = filters.status;
    if (filters.paymentStatus !== "all")
      toStore.paymentStatus = filters.paymentStatus;
    if (filters.dateRange?.from) {
      toStore.dateRange = {
        from: filters.dateRange.from.toISOString(),
        to: filters.dateRange.to?.toISOString(),
      };
    }

    // Only write if there are filters to store
    if (Object.keys(toStore).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error("Error writing filters to storage:", error);
  }
}

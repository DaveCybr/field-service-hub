// ============================================
// SERVER-SIDE PAGINATION HOOK
// src/hooks/useServerPagination.ts
// Handle large datasets with backend pagination
// ============================================

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

interface ServerPaginationResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  pageCount: number;
  totalRows: number;
  pagination: PaginationState;
  setPagination: (pagination: PaginationState) => void;
  refetch: () => Promise<void>;
}

type AllowedTables =
  | "audit_logs"
  | "employees"
  | "customer_outstanding_history"
  | "customers"
  | "invoices"
  | "customer_users"
  | "inventory_transactions"
  | "products"
  | "invoice_items"
  | "units"
  | "user_roles"
  | "customers_overdue"
  | "customers_with_outstanding"
  | "v_service_assignments";

interface UseServerPaginationOptions {
  table: any;
  select: string;
  orderBy?: { column: string; ascending?: boolean };
  filters?: Record<string, any>;
  searchColumn?: string;
  searchValue?: string;
  initialPageSize?: number;
}

export function useServerPagination<T>(
  options: UseServerPaginationOptions,
): ServerPaginationResult<T> {
  const {
    table,
    select,
    orderBy = { column: "created_at", ascending: false },
    filters = {},
    searchColumn,
    searchValue,
    initialPageSize = 10,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Calculate range
      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;

      // Build query
      let query = supabase
        .from(table)
        .select(select, { count: "exact" })
        .range(from, to)
        .order(orderBy.column, { ascending: orderBy.ascending });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "all") {
          query = query.eq(key, value);
        }
      });

      // Apply search
      if (searchColumn && searchValue) {
        query = query.ilike(searchColumn, `%${searchValue}%`);
      }

      const { data: result, error: queryError, count } = await query;

      if (queryError) throw queryError;

      setData(Array.isArray(result) ? (result as T[]) : []);
      setTotalRows(count || 0);
    } catch (err) {
      setError(err as Error);
      console.error("Server pagination error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    JSON.stringify(filters),
    searchValue,
  ]);

  const pageCount = Math.ceil(totalRows / pagination.pageSize);

  return {
    data,
    loading,
    error,
    pageCount,
    totalRows,
    pagination,
    setPagination,
    refetch: fetchData,
  };
}

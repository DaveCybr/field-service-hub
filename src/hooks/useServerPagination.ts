// ============================================
// SERVER-SIDE PAGINATION HOOK
// src/hooks/useServerPagination.ts
// Handle large datasets with backend pagination
// ============================================

import { useState, useEffect } from "react";
import { SortingState } from "@tanstack/react-table";
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
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
  refetch: () => Promise<void>;
}

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
  const [pagination, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  // Sorting state — default dari orderBy prop
  const [sorting, setSortingState] = useState<SortingState>([
    { id: orderBy.column, desc: !(orderBy.ascending ?? false) },
  ]);

  // Reset ke halaman pertama saat sorting berubah
  const setSorting = (newSorting: SortingState) => {
    setSortingState(newSorting);
    setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Reset ke halaman pertama saat pagination size berubah
  const setPagination = (newPagination: PaginationState) => {
    setPaginationState(newPagination);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;

      // Resolve sort column & direction dari sorting state
      const activeSort =
        sorting.length > 0
          ? { column: sorting[0].id, ascending: !sorting[0].desc }
          : orderBy;

      let query = supabase
        .from(table)
        .select(select, { count: "exact" })
        .range(from, to)
        .order(activeSort.column, { ascending: activeSort.ascending });

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "all") {
          query = query.eq(key, value);
        }
      });

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
    JSON.stringify(sorting),
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
    sorting,
    setSorting,
    refetch: fetchData,
  };
}

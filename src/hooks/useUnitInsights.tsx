import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ============================================
// TYPES
// ============================================

export interface RecurringIssue {
  id: string;
  unit_id: string;
  issue_category: string;
  issue_description: string;
  occurrence_count: number;
  first_occurrence: string;
  last_occurrence: string;
  avg_interval_days: number | null;
  service_ids: string[];
  status: "active" | "resolved" | "monitoring";
  severity: "low" | "medium" | "high" | "critical";
  recommended_action: string | null;
  estimated_fix_cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartUsage {
  id: string;
  service_id: string;
  unit_id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity_used: number;
  unit_price: number;
  total_cost: number;
  reason: string;
  condition_before: string | null;
  notes: string | null;
  created_at: string;
  service?: {
    title: string;
    created_at: string;
    invoice: {
      invoice_number: string;
    };
  };
}

export interface UnitInsights {
  recurringIssues: RecurringIssue[];
  partsHistory: PartUsage[];
  totalPartsCost: number;
  mostReplacedPart: {
    name: string;
    count: number;
    totalCost: number;
  } | null;
  criticalIssuesCount: number;
  activeIssuesCount: number;
}

// ============================================
// HOOK: useUnitInsights
// ============================================

export function useUnitInsights(unitId: string | undefined) {
  const { toast } = useToast();
  const [insights, setInsights] = useState<UnitInsights>({
    recurringIssues: [],
    partsHistory: [],
    totalPartsCost: 0,
    mostReplacedPart: null,
    criticalIssuesCount: 0,
    activeIssuesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!unitId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch recurring issues
      const { data: recurringData, error: recurringError } = await supabase
        .from("unit_recurring_issues")
        .select("*")
        .eq("unit_id", unitId)
        .order("severity", { ascending: false })
        .order("occurrence_count", { ascending: false });

      if (recurringError) throw recurringError;

      // Fetch parts history with service details
      const { data: partsData, error: partsError } = await supabase
        .from("service_parts_usage")
        .select(
          `
          *,
          service:invoice_services (
            title,
            created_at,
            invoice:invoices (
              invoice_number
            )
          )
        `,
        )
        .eq("unit_id", unitId)
        .order("created_at", { ascending: false });

      if (partsError) throw partsError;

      // Process parts data (flatten nested arrays)
      const processedParts: PartUsage[] =
        partsData?.map((part) => ({
          ...part,
          service: {
            title: (part.service as any)?.title || "Unknown Service",
            created_at: (part.service as any)?.created_at || part.created_at,
            invoice: {
              invoice_number:
                (part.service as any)?.invoice?.invoice_number ||
                (Array.isArray((part.service as any)?.invoice)
                  ? (part.service as any).invoice[0]?.invoice_number
                  : "N/A"),
            },
          },
        })) || [];

      // Calculate total parts cost
      const totalPartsCost = processedParts.reduce(
        (sum, part) => sum + (part.total_cost || 0),
        0,
      );

      // Find most replaced part
      const partsMap = new Map<string, { count: number; totalCost: number }>();
      processedParts.forEach((part) => {
        const existing = partsMap.get(part.product_name) || {
          count: 0,
          totalCost: 0,
        };
        partsMap.set(part.product_name, {
          count: existing.count + part.quantity_used,
          totalCost: existing.totalCost + part.total_cost,
        });
      });

      let mostReplacedPart: UnitInsights["mostReplacedPart"] = null;
      let maxCount = 0;

      partsMap.forEach((value, key) => {
        if (value.count > maxCount) {
          maxCount = value.count;
          mostReplacedPart = {
            name: key,
            count: value.count,
            totalCost: value.totalCost,
          };
        }
      });

      // Count critical and active issues
      const criticalIssuesCount =
        recurringData?.filter((issue) => issue.severity === "critical")
          .length || 0;
      const activeIssuesCount =
        recurringData?.filter((issue) => issue.status === "active").length || 0;

      setInsights({
        recurringIssues: (recurringData as RecurringIssue[]) || [],
        partsHistory: processedParts,
        totalPartsCost,
        mostReplacedPart,
        criticalIssuesCount,
        activeIssuesCount,
      });
    } catch (err: any) {
      console.error("Error fetching unit insights:", err);
      setError(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load unit insights",
      });
    } finally {
      setLoading(false);
    }
  }, [unitId, toast]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return {
    insights,
    loading,
    error,
    refetch: fetchInsights,
  };
}

// ============================================
// HOOK: useResolveRecurringIssue
// ============================================

export function useResolveRecurringIssue() {
  const { toast } = useToast();
  const [resolving, setResolving] = useState(false);

  const resolveIssue = useCallback(
    async (issueId: string, notes?: string) => {
      setResolving(true);

      try {
        const { error } = await supabase
          .from("unit_recurring_issues")
          .update({
            status: "resolved",
            resolved_at: new Date().toISOString(),
            notes: notes || null,
          })
          .eq("id", issueId);

        if (error) throw error;

        toast({
          title: "Issue Resolved",
          description: "The recurring issue has been marked as resolved",
        });

        return { success: true };
      } catch (error: any) {
        console.error("Error resolving issue:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to resolve issue",
        });
        return { success: false, error: error.message };
      } finally {
        setResolving(false);
      }
    },
    [toast],
  );

  return { resolveIssue, resolving };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getSeverityColor(severity: RecurringIssue["severity"]): string {
  const colors = {
    low: "bg-blue-100 text-blue-800 border-blue-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    critical: "bg-red-100 text-red-800 border-red-200",
  };
  return colors[severity] || colors.low;
}

export function getSeverityIcon(severity: RecurringIssue["severity"]): string {
  const icons = {
    low: "ℹ️",
    medium: "⚠️",
    high: "🔴",
    critical: "🚨",
  };
  return icons[severity] || icons.low;
}

export function formatIssueCategoryDisplay(category: string): string {
  const displayNames: Record<string, string> = {
    freon_leak: "Freon Leak",
    compressor_failure: "Compressor Failure",
    electrical: "Electrical Problem",
    filter_dirty: "Filter Issues",
    motor_failure: "Motor Failure",
    pcb_failure: "PCB/Board Failure",
    other: "Other Issues",
  };
  return displayNames[category] || category;
}

export function calculateMonthsBetween(
  startDate: string,
  endDate: string,
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  return Math.max(1, months);
}

// ============================================
// TECHNICIAN ASSIGNMENT HOOKS
// Stub implementation - service_technician_assignments table not yet created
// ============================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ServiceTechnicianAssignment,
  AssignmentWithTechnician,
  AssignmentWithDetails,
  TechnicianInfo,
  ServiceTeam,
  AssignTechnicianForm,
  TechnicianAssignmentFilters,
  TechnicianRole,
  AssignmentStatus,
} from "@/types/technician-assignment";

// ============================================
// HOOK: useServiceTeam
// ============================================
export function useServiceTeam(invoiceId: string, serviceId: string | null) {
  const [team, setTeam] = useState<AssignmentWithTechnician[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeam = useCallback(async () => {
    // Table not yet created - return empty
    setTeam([]);
    setLoading(false);
  }, [invoiceId, serviceId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  return { team, loading, error, refetch: fetchTeam };
}

// ============================================
// HOOK: useInvoiceTeams
// ============================================
export function useInvoiceTeams(invoiceId: string) {
  const [teams, setTeams] = useState<ServiceTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeams = useCallback(async () => {
    setTeams([]);
    setLoading(false);
  }, [invoiceId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return { teams, loading, error, refetch: fetchTeams };
}

// ============================================
// HOOK: useAssignTechnician
// ============================================
export function useAssignTechnician() {
  const [loading, setLoading] = useState(false);

  const assignTechnician = useCallback(async (form: AssignTechnicianForm) => {
    toast.info("Fitur penugasan tim belum tersedia");
    return { success: false, error: "Tabel belum dibuat" };
  }, []);

  return { assignTechnician, loading };
}

// ============================================
// HOOK: useRemoveAssignment
// ============================================
export function useRemoveAssignment() {
  const [loading, setLoading] = useState(false);

  const removeAssignment = useCallback(async (assignmentId: string) => {
    toast.info("Fitur penugasan tim belum tersedia");
    return { success: false, error: "Tabel belum dibuat" };
  }, []);

  return { removeAssignment, loading };
}

// ============================================
// HOOK: useUpdateAssignment
// ============================================
export function useUpdateAssignment() {
  const [loading, setLoading] = useState(false);

  const updateAssignment = useCallback(
    async (assignmentId: string, updates: Partial<any>) => {
      toast.info("Fitur penugasan tim belum tersedia");
      return { success: false, error: "Tabel belum dibuat" };
    },
    [],
  );

  return { updateAssignment, loading };
}

// ============================================
// HOOK: useAvailableTechnicians
// ============================================
export function useAvailableTechnicians(invoiceId: string, serviceId: string | null) {
  const [technicians, setTechnicians] = useState<TechnicianInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAvailable() {
      try {
        setLoading(true);
        const { data: allTechs, error: techError } = await supabase
          .from("employees")
          .select("id, name, email, phone, avatar_url")
          .eq("role", "technician");

        if (techError) throw techError;

        setTechnicians(
          (allTechs || []).map((t) => ({
            ...t,
            technician_level: null,
          })) as TechnicianInfo[],
        );
      } catch (err) {
        console.error("Error fetching technicians:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAvailable();
  }, [invoiceId, serviceId]);

  return { technicians, loading };
}

// ============================================
// HOOK: useQuickAssign
// ============================================
export function useQuickAssign() {
  const [loading, setLoading] = useState(false);

  const quickAssign = useCallback(
    async (invoiceId: string, serviceId: string | null, technicianId: string) => {
      try {
        setLoading(true);

        // Update the invoice_services directly
        if (serviceId) {
          const { error } = await supabase
            .from("invoice_services")
            .update({ assigned_technician_id: technicianId, status: "assigned" })
            .eq("id", serviceId);
          if (error) throw error;
        }

        toast.success("Teknisi berhasil ditugaskan");
        return { success: true };
      } catch (error: any) {
        toast.error(error.message || "Gagal menugaskan teknisi");
        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { quickAssign, loading };
}

// ============================================
// TECHNICIAN ASSIGNMENT HOOKS
// src/hooks/useTechnicianAssignment.tsx
// ============================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!invoiceId) {
      setTeam([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("service_technician_assignments")
        .select(
          `
          *,
          technician:employees!service_technician_assignments_technician_id_fkey (
            id,
            name,
            email,
            phone,
            avatar_url,
            technician_level
          )
        `,
        )
        .eq("invoice_id", invoiceId)
        .order("assigned_at", { ascending: true });

      if (serviceId) {
        query = query.eq("service_id", serviceId);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      const formatted: AssignmentWithTechnician[] = (data || []).map(
        (item) => ({
          id: item.id,
          invoice_id: item.invoice_id,
          service_id: item.service_id,
          technician_id: item.technician_id,
          role: item.role as TechnicianRole,
          status: (item.status || "assigned") as AssignmentStatus,
          notes: item.notes,
          assigned_at: item.assigned_at,
          assigned_by: item.assigned_by,
          created_at: item.created_at,
          updated_at: item.updated_at,
          technician: Array.isArray(item.technician)
            ? item.technician[0]
            : item.technician,
        }),
      );

      setTeam(formatted);
    } catch (err: any) {
      console.error("Error fetching team:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [invoiceId, serviceId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Real-time subscription
  useEffect(() => {
    if (!invoiceId) return;

    const channel = supabase
      .channel(`team-${invoiceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_technician_assignments",
          filter: `invoice_id=eq.${invoiceId}`,
        },
        () => {
          fetchTeam();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invoiceId, fetchTeam]);

  return { team, loading, error, refetch: fetchTeam };
}

// ============================================
// HOOK: useInvoiceTeams
// ============================================
export function useInvoiceTeams(invoiceId: string) {
  const [teams, setTeams] = useState<ServiceTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!invoiceId) {
      setTeams([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error: queryError } = await supabase
        .from("service_technician_assignments")
        .select(
          `
          *,
          technician:employees!service_technician_assignments_technician_id_fkey (
            id,
            name,
            email,
            phone,
            avatar_url,
            technician_level
          )
        `,
        )
        .eq("invoice_id", invoiceId)
        .order("assigned_at", { ascending: true });

      if (queryError) throw queryError;

      // Group by service_id
      const serviceMap = new Map<string | null, AssignmentWithTechnician[]>();

      (data || []).forEach((item) => {
        const key = item.service_id || null;
        const existing = serviceMap.get(key) || [];
        existing.push({
          id: item.id,
          invoice_id: item.invoice_id,
          service_id: item.service_id,
          technician_id: item.technician_id,
          role: item.role as TechnicianRole,
          status: (item.status || "assigned") as AssignmentStatus,
          notes: item.notes,
          assigned_at: item.assigned_at,
          assigned_by: item.assigned_by,
          created_at: item.created_at,
          updated_at: item.updated_at,
          technician: Array.isArray(item.technician)
            ? item.technician[0]
            : item.technician,
        });
        serviceMap.set(key, existing);
      });

      const result: ServiceTeam[] = Array.from(serviceMap.entries()).map(
        ([serviceId, assignments]) => ({
          service_id: serviceId,
          service_title: undefined,
          assignments,
          lead: assignments.find((a) => a.role === "lead"),
          members: assignments.filter((a) => a.role !== "lead"),
        }),
      );

      setTeams(result);
    } catch (err: any) {
      console.error("Error fetching teams:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
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
  const { employee } = useAuth();

  const assignTechnician = useCallback(
    async (form: AssignTechnicianForm) => {
      try {
        setLoading(true);

        // Check if technician already assigned to this invoice+service
        let checkQuery = supabase
          .from("service_technician_assignments")
          .select("id")
          .eq("invoice_id", form.invoice_id)
          .eq("technician_id", form.technician_id);

        if (form.service_id) {
          checkQuery = checkQuery.eq("service_id", form.service_id);
        }

        const { data: existing } = await checkQuery;

        if (existing && existing.length > 0) {
          toast.error("Teknisi sudah ditugaskan untuk servis ini");
          return { success: false, error: "Teknisi sudah ditugaskan" };
        }

        const { data, error } = await supabase
          .from("service_technician_assignments")
          .insert({
            invoice_id: form.invoice_id,
            service_id: form.service_id || null,
            technician_id: form.technician_id,
            role: form.role,
            notes: form.notes || null,
            assigned_by: employee?.id || null,
            status: "assigned",
          })
          .select()
          .single();

        if (error) throw error;

        // Also update invoice_services.assigned_technician_id if role is lead and service_id exists
        if (form.role === "lead" && form.service_id) {
          await supabase
            .from("invoice_services")
            .update({
              assigned_technician_id: form.technician_id,
              status: "assigned",
            })
            .eq("id", form.service_id);
        }

        // Update invoice status to assigned if it was pending
        const { data: invoice } = await supabase
          .from("invoices")
          .select("status")
          .eq("id", form.invoice_id)
          .single();

        if (invoice?.status === "pending") {
          await supabase
            .from("invoices")
            .update({ status: "assigned" })
            .eq("id", form.invoice_id);
        }

        toast.success("Teknisi berhasil ditugaskan");
        return { success: true, data };
      } catch (error: any) {
        console.error("Error assigning technician:", error);
        toast.error(error.message || "Gagal menugaskan teknisi");
        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },
    [employee?.id],
  );

  return { assignTechnician, loading };
}

// ============================================
// HOOK: useRemoveAssignment
// ============================================
export function useRemoveAssignment() {
  const [loading, setLoading] = useState(false);

  const removeAssignment = useCallback(async (assignmentId: string) => {
    try {
      setLoading(true);

      // Get assignment details before deleting
      const { data: assignment } = await supabase
        .from("service_technician_assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();

      const { error } = await supabase
        .from("service_technician_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      // If this was the lead, clear invoice_services.assigned_technician_id
      if (assignment?.role === "lead" && assignment?.service_id) {
        await supabase
          .from("invoice_services")
          .update({ assigned_technician_id: null })
          .eq("id", assignment.service_id);
      }

      toast.success("Teknisi berhasil dihapus dari tim");
      return { success: true };
    } catch (error: any) {
      console.error("Error removing assignment:", error);
      toast.error(error.message || "Gagal menghapus teknisi dari tim");
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { removeAssignment, loading };
}

// ============================================
// HOOK: useUpdateAssignment
// ============================================
export function useUpdateAssignment() {
  const [loading, setLoading] = useState(false);

  const updateAssignment = useCallback(
    async (
      assignmentId: string,
      updates: Partial<ServiceTechnicianAssignment>,
    ) => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("service_technician_assignments")
          .update(updates)
          .eq("id", assignmentId)
          .select()
          .single();

        if (error) throw error;

        toast.success("Penugasan berhasil diperbarui");
        return { success: true, data };
      } catch (error: any) {
        console.error("Error updating assignment:", error);
        toast.error(error.message || "Gagal memperbarui penugasan");
        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { updateAssignment, loading };
}

// ============================================
// HOOK: useAvailableTechnicians
// ============================================
export function useAvailableTechnicians(
  invoiceId: string,
  serviceId: string | null,
) {
  const [technicians, setTechnicians] = useState<TechnicianInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAvailable() {
      try {
        setLoading(true);

        // Get all technicians
        const { data: allTechs, error: techError } = await supabase
          .from("employees")
          .select("id, name, email, phone, avatar_url, technician_level")
          .eq("role", "technician");

        if (techError) throw techError;

        // Get already assigned technician IDs for this invoice+service
        let assignedQuery = supabase
          .from("service_technician_assignments")
          .select("technician_id")
          .eq("invoice_id", invoiceId);

        if (serviceId) {
          assignedQuery = assignedQuery.eq("service_id", serviceId);
        }

        const { data: assigned } = await assignedQuery;
        const assignedIds = new Set(
          (assigned || []).map((a) => a.technician_id),
        );

        // Filter out already assigned
        const available = (allTechs || [])
          .filter((t) => !assignedIds.has(t.id))
          .map((t) => ({
            ...t,
            technician_level: t.technician_level || null,
          })) as TechnicianInfo[];

        setTechnicians(available);
      } catch (err) {
        console.error("Error fetching available technicians:", err);
      } finally {
        setLoading(false);
      }
    }

    if (invoiceId) {
      fetchAvailable();
    }
  }, [invoiceId, serviceId]);

  return { technicians, loading };
}

// ============================================
// HOOK: useQuickAssign
// ============================================
export function useQuickAssign() {
  const [loading, setLoading] = useState(false);
  const { employee } = useAuth();

  const quickAssign = useCallback(
    async (
      invoiceId: string,
      serviceId: string | null,
      technicianId: string,
    ) => {
      try {
        setLoading(true);

        // Insert into service_technician_assignments as lead
        const { error: assignError } = await supabase
          .from("service_technician_assignments")
          .insert({
            invoice_id: invoiceId,
            service_id: serviceId,
            technician_id: technicianId,
            role: "lead",
            assigned_by: employee?.id || null,
            status: "assigned",
          });

        if (assignError) throw assignError;

        // Update invoice_services if serviceId provided
        if (serviceId) {
          await supabase
            .from("invoice_services")
            .update({
              assigned_technician_id: technicianId,
              status: "assigned",
            })
            .eq("id", serviceId);
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
    [employee?.id],
  );

  return { quickAssign, loading };
}

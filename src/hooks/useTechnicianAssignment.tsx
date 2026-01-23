// ============================================
// TECHNICIAN ASSIGNMENT HOOKS (Type-Safe Version)
// src/hooks/useTechnicianAssignment.tsx
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

// Type for raw database response
type DbAssignment = {
  id: string;
  invoice_id: string;
  service_id: string | null;
  technician_id: string;
  role: string;
  status: string;
  assigned_at: string;
  assigned_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  technician?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    technician_level: string | null;
  };
  assigned_by_user?: {
    name: string;
  };
};

// ============================================
// HOOK: useServiceTeam
// Get all technicians assigned to a specific service
// ============================================

export function useServiceTeam(invoiceId: string, serviceId: string | null) {
  const [team, setTeam] = useState<AssignmentWithTechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("service_technician_assignments")
        .select(
          `
          *,
          technician:employees!technician_id (
            id,
            name,
            email,
            phone,
            avatar_url,
            technician_level
          ),
          assigned_by_user:employees!assigned_by (
            name
          )
        `,
        )
        .eq("invoice_id", invoiceId)
        .neq("status", "rejected");

      if (serviceId) {
        query = query.eq("service_id", serviceId);
      } else {
        query = query.is("service_id", null);
      }

      const { data, error: fetchError } = await query.order("created_at", {
        ascending: true,
      });

      if (fetchError) throw fetchError;

      const formattedData: AssignmentWithTechnician[] = (
        (data as any[]) || []
      ).map((item: any) => ({
        id: item.id,
        invoice_id: item.invoice_id,
        service_id: item.service_id,
        technician_id: item.technician_id,
        role: item.role as "lead" | "senior" | "junior" | "helper",
        status: item.status as
          | "assigned"
          | "accepted"
          | "rejected"
          | "completed",
        assigned_at: item.assigned_at,
        assigned_by: item.assigned_by,
        notes: item.notes,
        created_at: item.created_at,
        updated_at: item.updated_at,
        technician: {
          id: item.technician.id,
          name: item.technician.name,
          email: item.technician.email,
          phone: item.technician.phone,
          avatar_url: item.technician.avatar_url,
          technician_level: item.technician.technician_level,
        },
        assigned_by_name: item.assigned_by_user?.name,
      }));

      setTeam(formattedData);
    } catch (err) {
      setError(err as Error);
      console.error("Error fetching service team:", err);
    } finally {
      setLoading(false);
    }
  }, [invoiceId, serviceId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`service-team-${invoiceId}-${serviceId || "all"}`)
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
  }, [invoiceId, serviceId, fetchTeam]);

  return { team, loading, error, refetch: fetchTeam };
}

// ============================================
// HOOK: useInvoiceTeams
// Get all teams for all services in an invoice
// ============================================

export function useInvoiceTeams(invoiceId: string) {
  const [teams, setTeams] = useState<ServiceTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all services for invoice
      const { data: services, error: servicesError } = await supabase
        .from("invoice_services")
        .select("id, title, status")
        .eq("invoice_id", invoiceId);

      if (servicesError) throw servicesError;

      // Fetch all assignments for invoice
      const { data: assignments, error: assignmentsError } = await supabase
        .from("service_technician_assignments")
        .select(
          `
          *,
          technician:employees!technician_id (
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
        .neq("status", "rejected");

      if (assignmentsError) throw assignmentsError;

      // Group assignments by service
      const teamsMap = new Map<string | null, ServiceTeam>();

      ((assignments as any[]) || []).forEach((assignment: any) => {
        const serviceId = assignment.service_id;
        const service = services?.find((s) => s.id === serviceId);

        if (!teamsMap.has(serviceId)) {
          teamsMap.set(serviceId, {
            service_id: serviceId,
            service_title: service?.title,
            assignments: [],
            members: [],
          });
        }

        const team = teamsMap.get(serviceId)!;
        const formattedAssignment: AssignmentWithTechnician = {
          id: assignment.id,
          invoice_id: assignment.invoice_id,
          service_id: assignment.service_id,
          technician_id: assignment.technician_id,
          role: assignment.role as TechnicianRole,
          status: assignment.status as AssignmentStatus,
          assigned_at: assignment.assigned_at,
          assigned_by: assignment.assigned_by,
          notes: assignment.notes,
          created_at: assignment.created_at,
          updated_at: assignment.updated_at,
          technician: {
            id: assignment.technician.id,
            name: assignment.technician.name,
            email: assignment.technician.email,
            phone: assignment.technician.phone,
            avatar_url: assignment.technician.avatar_url,
            technician_level: assignment.technician.technician_level,
          },
        };

        team.assignments.push(formattedAssignment);

        if (assignment.role === "lead") {
          team.lead = formattedAssignment;
        } else {
          team.members.push(formattedAssignment);
        }
      });

      setTeams(Array.from(teamsMap.values()));
    } catch (err) {
      setError(err as Error);
      console.error("Error fetching invoice teams:", err);
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
// Assign technician to a service
// ============================================

export function useAssignTechnician() {
  const [loading, setLoading] = useState(false);

  const assignTechnician = useCallback(async (form: AssignTechnicianForm) => {
    try {
      setLoading(true);

      // Get current user as assigned_by
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!employee) throw new Error("Employee profile not found");

      // Check if already assigned
      const { data: existing } = await supabase
        .from("service_technician_assignments")
        .select("id")
        .eq("invoice_id", form.invoice_id)
        .eq("technician_id", form.technician_id)
        .maybeSingle();

      // Apply service_id filter only if it's not null
      if (form.service_id !== null && existing) {
        const { data: existingWithService } = await supabase
          .from("service_technician_assignments")
          .select("id")
          .eq("invoice_id", form.invoice_id)
          .eq("technician_id", form.technician_id)
          .eq("service_id", form.service_id)
          .maybeSingle();

        if (existingWithService) {
          throw new Error("Teknisi sudah ditugaskan untuk servis ini");
        }
      } else if (existing) {
        throw new Error("Teknisi sudah ditugaskan untuk invoice ini");
      }

      // Check if trying to assign lead when lead already exists
      if (form.role === "lead") {
        let leadQuery = supabase
          .from("service_technician_assignments")
          .select("id")
          .eq("invoice_id", form.invoice_id)
          .eq("role", "lead")
          .neq("status", "rejected");

        if (form.service_id !== null) {
          leadQuery = leadQuery.eq("service_id", form.service_id);
        } else {
          leadQuery = leadQuery.is("service_id", null);
        }

        const { data: existingLead } = await leadQuery.maybeSingle();

        if (existingLead) {
          throw new Error("Sudah ada Kepala Teknisi untuk servis ini");
        }
      }

      // Insert assignment
      const insertData: any = {
        invoice_id: form.invoice_id,
        technician_id: form.technician_id,
        role: form.role,
        assigned_by: employee.id,
      };

      if (form.service_id !== null) {
        insertData.service_id = form.service_id;
      }

      if (form.notes) {
        insertData.notes = form.notes;
      }

      const { error } = await supabase
        .from("service_technician_assignments")
        .insert(insertData);

      if (error) throw error;

      toast.success("Teknisi berhasil ditugaskan");
      return { success: true };
    } catch (error: any) {
      console.error("Error assigning technician:", error);
      toast.error(error.message || "Gagal menugaskan teknisi");
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { assignTechnician, loading };
}

// ============================================
// HOOK: useRemoveAssignment
// Remove technician from assignment
// ============================================

export function useRemoveAssignment() {
  const [loading, setLoading] = useState(false);

  const removeAssignment = useCallback(async (assignmentId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("service_technician_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast.success("Teknisi berhasil dihapus dari penugasan");
      return { success: true };
    } catch (error: any) {
      console.error("Error removing assignment:", error);
      toast.error(error.message || "Gagal menghapus penugasan");
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { removeAssignment, loading };
}

// ============================================
// HOOK: useUpdateAssignment
// Update assignment (e.g., change role, status)
// ============================================

export function useUpdateAssignment() {
  const [loading, setLoading] = useState(false);

  const updateAssignment = useCallback(
    async (
      assignmentId: string,
      updates: Partial<
        Omit<ServiceTechnicianAssignment, "technician" | "assigned_by_name">
      >,
    ) => {
      try {
        setLoading(true);

        const { error } = await supabase
          .from("service_technician_assignments")
          .update(updates as any)
          .eq("id", assignmentId);

        if (error) throw error;

        toast.success("Penugasan berhasil diperbarui");
        return { success: true };
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
// Get list of available technicians (not yet assigned)
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

        // Get already assigned technicians
        let query = supabase
          .from("service_technician_assignments")
          .select("technician_id")
          .eq("invoice_id", invoiceId)
          .neq("status", "rejected");

        if (serviceId !== null) {
          query = query.eq("service_id", serviceId);
        } else {
          query = query.is("service_id", null);
        }

        const { data: assigned, error: assignError } = await query;

        if (assignError) throw assignError;

        const assignedIds = new Set(
          (assigned || []).map((a: any) => a.technician_id),
        );
        const available = (allTechs || []).filter(
          (t) => !assignedIds.has(t.id),
        );

        setTechnicians(available as TechnicianInfo[]);
      } catch (error) {
        console.error("Error fetching available technicians:", error);
        toast.error("Gagal memuat daftar teknisi");
      } finally {
        setLoading(false);
      }
    }

    fetchAvailable();
  }, [invoiceId, serviceId]);

  return { technicians, loading };
}

// ============================================
// HOOK: useTechnicianAssignments
// Get all assignments for a technician (for technician dashboard)
// ============================================

export function useTechnicianAssignments(
  technicianId: string,
  filters?: TechnicianAssignmentFilters,
) {
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAssignments() {
      try {
        setLoading(true);

        let query = supabase
          .from("service_technician_assignments")
          .select(
            `
            *,
            technician:employees!technician_id (id, name, email),
            invoice:invoices!invoice_id (invoice_number, status),
            service:invoice_services!service_id (title, status)
          `,
          )
          .eq("technician_id", technicianId)
          .neq("status", "rejected");

        if (filters?.status) {
          query = query.eq("status", filters.status);
        }

        if (filters?.from_date) {
          query = query.gte("assigned_at", filters.from_date);
        }

        if (filters?.to_date) {
          query = query.lte("assigned_at", filters.to_date);
        }

        const { data, error } = await query.order("assigned_at", {
          ascending: false,
        });

        if (error) throw error;

        const formatted: AssignmentWithDetails[] = ((data as any[]) || []).map(
          (item: any) => ({
            id: item.id,
            invoice_id: item.invoice_id,
            service_id: item.service_id,
            technician_id: item.technician_id,
            role: item.role as "lead" | "senior" | "junior" | "helper",
            status: item.status as
              | "assigned"
              | "accepted"
              | "rejected"
              | "completed",
            assigned_at: item.assigned_at,
            assigned_by: item.assigned_by,
            notes: item.notes,
            created_at: item.created_at,
            updated_at: item.updated_at,
            technician: {
              id: item.technician.id,
              name: item.technician.name,
              email: item.technician.email,
              phone: null,
              avatar_url: null,
              technician_level: null,
            },
            invoice_number: item.invoice.invoice_number,
            invoice_status: item.invoice.status,
            service_title: item.service?.title,
            service_status: item.service?.status,
          }),
        );

        setAssignments(formatted);
      } catch (error) {
        console.error("Error fetching technician assignments:", error);
        toast.error("Gagal memuat daftar penugasan");
      } finally {
        setLoading(false);
      }
    }

    fetchAssignments();
  }, [technicianId, filters]);

  return { assignments, loading };
}

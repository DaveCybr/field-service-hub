// ============================================
// MULTI-TECHNICIAN ASSIGNMENT TYPES
// src/types/technician-assignment.ts
// ============================================

import { Database } from "@/integrations/supabase/types";

// Base types from Supabase
export type Employee = Database["public"]["Tables"]["employees"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceService =
  Database["public"]["Tables"]["invoice_services"]["Row"];

// ============================================
// TECHNICIAN ASSIGNMENT TYPES
// ============================================

export type TechnicianRole = "lead" | "senior" | "junior" | "helper";
export type AssignmentStatus =
  | "assigned"
  | "accepted"
  | "rejected"
  | "completed";

export interface ServiceTechnicianAssignment {
  id: string;
  invoice_id: string;
  service_id: string | null; // null = applies to all services in invoice
  technician_id: string;
  role: TechnicianRole;
  status: AssignmentStatus;
  assigned_at: string;
  assigned_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// EXTENDED TYPES WITH RELATIONS
// ============================================

export interface TechnicianInfo {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  technician_level: string | null; // This is informational, NOT the same as role
}

export interface AssignmentWithTechnician extends ServiceTechnicianAssignment {
  technician: TechnicianInfo;
  assigned_by_name?: string;
}

export interface AssignmentWithDetails extends AssignmentWithTechnician {
  invoice_number: string;
  invoice_status: string;
  service_title?: string;
  service_status?: string;
}

// ============================================
// SERVICE WITH TEAM
// ============================================

export interface ServiceTeam {
  service_id: string | null;
  service_title?: string;
  assignments: AssignmentWithTechnician[];
  lead?: AssignmentWithTechnician;
  members: AssignmentWithTechnician[];
}

export interface InvoiceWithTeams extends Invoice {
  teams: ServiceTeam[];
  all_technicians: TechnicianInfo[];
  lead_technician?: TechnicianInfo;
}

// ============================================
// FORM TYPES FOR ASSIGNMENT
// ============================================

export interface AssignTechnicianForm {
  invoice_id: string;
  service_id: string | null;
  technician_id: string;
  role: TechnicianRole;
  notes?: string;
}

export interface BulkAssignForm {
  invoice_id: string;
  service_id: string | null;
  assignments: {
    technician_id: string;
    role: TechnicianRole;
  }[];
}

// ============================================
// FILTER & QUERY TYPES
// ============================================

export interface TechnicianAssignmentFilters {
  invoice_id?: string;
  service_id?: string;
  technician_id?: string;
  role?: TechnicianRole;
  status?: AssignmentStatus;
  from_date?: string;
  to_date?: string;
}

// ============================================
// STATUS HISTORY TYPES
// ============================================

export interface InvoiceStatusHistory {
  id: string;
  invoice_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

export interface StatusHistoryWithUser extends InvoiceStatusHistory {
  changed_by_name?: string;
}

// ============================================
// INVOICE STATUS TYPES (UPDATED)
// ============================================

export type InvoiceStatus =
  | "draft"
  | "pending"
  | "assigned" // NEW
  | "in_progress"
  | "completed"
  | "paid"
  | "closed" // NEW
  | "cancelled";

export type InvoicePaymentStatus = "unpaid" | "partial" | "paid";

export type ServiceStatus =
  | "pending"
  | "assigned" // NEW
  | "in_progress"
  | "completed"
  | "cancelled";

// ============================================
// ROLE BADGE CONFIGS
// ============================================

export const ROLE_CONFIG: Record<
  TechnicianRole,
  {
    label: string;
    color: string;
    bgColor: string;
    icon?: string;
  }
> = {
  lead: {
    label: "Kepala Teknisi",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  senior: {
    label: "Teknisi Senior",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  junior: {
    label: "Teknisi Junior",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  helper: {
    label: "Helper",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
  },
};

export const STATUS_CONFIG: Record<
  AssignmentStatus,
  {
    label: string;
    color: string;
  }
> = {
  assigned: {
    label: "Ditugaskan",
    color: "bg-yellow-100 text-yellow-800",
  },
  accepted: {
    label: "Diterima",
    color: "bg-blue-100 text-blue-800",
  },
  rejected: {
    label: "Ditolak",
    color: "bg-red-100 text-red-800",
  },
  completed: {
    label: "Selesai",
    color: "bg-green-100 text-green-800",
  },
};

// ============================================
// HELPER TYPE GUARDS
// ============================================

export function isLeadTechnician(
  assignment: ServiceTechnicianAssignment,
): boolean {
  return assignment.role === "lead";
}

export function hasLeadInTeam(
  assignments: ServiceTechnicianAssignment[],
): boolean {
  return assignments.some((a) => a.role === "lead");
}

export function getLeadFromTeam(
  assignments: AssignmentWithTechnician[],
): AssignmentWithTechnician | undefined {
  return assignments.find((a) => a.role === "lead");
}

export function sortByRole(
  assignments: ServiceTechnicianAssignment[],
): ServiceTechnicianAssignment[] {
  const roleOrder: Record<TechnicianRole, number> = {
    lead: 1,
    senior: 2,
    junior: 3,
    helper: 4,
  };

  return [...assignments].sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
}

// ============================================
// VALIDATION HELPERS
// ============================================

export function validateAssignment(form: AssignTechnicianForm): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!form.technician_id) {
    errors.push("Pilih teknisi");
  }

  if (!form.role) {
    errors.push("Pilih role teknisi");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function canAddMoreTechnicians(
  currentAssignments: ServiceTechnicianAssignment[],
  maxTechnicians: number = 10, // Default max, can be changed
): boolean {
  return currentAssignments.length < maxTechnicians;
}

export function canAssignAsLead(
  currentAssignments: ServiceTechnicianAssignment[],
): boolean {
  return !hasLeadInTeam(currentAssignments);
}

// ============================================
// TYPE CONVERSION HELPERS
// ============================================

/**
 * Convert technician_level string to display format
 * Note: technician_level is informational, NOT the assignment role
 */
export function formatTechnicianLevel(level: string | null): string {
  if (!level) return "-";

  const levelMap: Record<string, string> = {
    lead: "Level: Lead",
    senior: "Level: Senior",
    junior: "Level: Junior",
    helper: "Level: Helper",
  };

  return levelMap[level.toLowerCase()] || level;
}

/**
 * Check if a technician_level matches a role
 * Used for smart suggestions (e.g., suggest lead role for lead-level technician)
 */
export function suggestRoleFromLevel(
  level: string | null,
): TechnicianRole | null {
  if (!level) return null;

  const normalized = level.toLowerCase();
  if (
    normalized === "lead" ||
    normalized === "senior" ||
    normalized === "junior" ||
    normalized === "helper"
  ) {
    return normalized as TechnicianRole;
  }

  return null;
}

/**
 * ============================================
 * FILE: technician.types.ts
 * LOCATION: src/types/technician.types.ts
 * Disesuaikan dengan skema database yang sebenarnya
 * ============================================
 */

// ============================================
// BASE TYPES — dari DB Enums
// ============================================

/**
 * Status employee dari DB enum employee_status
 */
export type EmployeeStatus = "available" | "on_job" | "locked" | "off_duty";

/**
 * Role employee dari DB enum employee_role
 */
export type EmployeeRole =
  | "admin"
  | "manager"
  | "technician"
  | "cashier"
  | "superadmin";

// ============================================
// MAIN INTERFACES — sesuai tabel di DB
// ============================================

/**
 * Interface: Employee
 * Table: employees
 * Mencakup semua staff termasuk teknisi (role = 'technician')
 */
export interface Employee {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: EmployeeRole;
  status: EmployeeStatus;
  avatar_url: string | null;
  rating: number | null;
  technician_level: string | null;
  total_jobs_completed: number | null;
  is_being_tracked: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface: ServiceAssignment
 * Table: service_technician_assignments
 * Penugasan teknisi ke service/invoice
 */
export interface ServiceAssignment {
  id: string;
  invoice_id: string;
  technician_id: string;
  service_id: string | null;
  role: string; // 'lead', 'assistant', 'technician', dll
  status: string | null; // 'assigned', 'in_progress', 'completed', 'cancelled'
  notes: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Interface: TechnicianLocation
 * Table: technician_locations
 * Lokasi terakhir teknisi (one-to-one dengan employees)
 */
export interface TechnicianLocation {
  id: string;
  technician_id: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  is_active: boolean | null;
  recorded_at: string | null;
  updated_at: string | null;
}

// ============================================
// EXTENDED INTERFACES — dengan relasi
// ============================================

/**
 * Employee dengan jumlah pekerjaan aktif
 */
export interface EmployeeWithStats extends Employee {
  active_jobs_count: number;
  assignments?: ServiceAssignment[];
}

/**
 * Assignment dengan detail relasi lengkap
 */
export interface AssignmentWithDetails extends ServiceAssignment {
  technician?: Pick<
    Employee,
    | "id"
    | "name"
    | "email"
    | "phone"
    | "avatar_url"
    | "status"
    | "rating"
    | "technician_level"
  >;
  invoice?: {
    id: string;
    invoice_number: string;
    status: string;
    payment_status?: string;
    customer?: {
      name: string;
      phone: string;
      address?: string | null;
    };
  };
  service?: {
    id: string;
    title: string;
    status: string;
    priority: string;
    service_address: string | null;
    scheduled_date: string | null;
    description: string | null;
    before_photos?: string[] | null;
    after_photos?: string[] | null;
    checkin_latitude?: number | null;
    checkin_longitude?: number | null;
    checkout_latitude?: number | null;
    checkout_longitude?: number | null;
    actual_checkin_at?: string | null;
    actual_checkout_at?: string | null;
    gps_violation_detected?: boolean | null;
  };
}

// ============================================
// INPUT TYPES — untuk Create/Update
// ============================================

/**
 * Update data employee (tidak bisa ganti id, created_at)
 */
export type UpdateEmployeeInput = Partial<
  Omit<Employee, "id" | "created_at" | "updated_at">
>;

/**
 * Input untuk membuat assignment baru
 */
export type CreateAssignmentInput = {
  invoice_id: string;
  technician_id: string;
  service_id?: string;
  role?: string; // default: 'technician'
  notes?: string;
};

/**
 * Input untuk update assignment
 */
export type UpdateAssignmentInput = {
  status?: string;
  notes?: string;
  role?: string;
};

// ============================================
// FILTER TYPES
// ============================================

/**
 * Filter untuk query teknisi
 */
export type EmployeeFilters = {
  status?: EmployeeStatus | "all";
  search?: string;
};

/**
 * Filter untuk query assignment
 */
export type AssignmentFilters = {
  status?: string | "all";
  technician_id?: string;
  invoice_id?: string;
  service_id?: string;
  date_from?: string;
  date_to?: string;
};

// ============================================
// UTILITY TYPES
// ============================================

export type Coordinates = {
  latitude: number;
  longitude: number;
};

// ============================================
// CONSTANTS
// ============================================

export const EMPLOYEE_STATUS_OPTIONS = [
  { value: "available", label: "Tersedia", color: "emerald" },
  { value: "on_job", label: "Sedang Bertugas", color: "amber" },
  { value: "locked", label: "Terkunci", color: "red" },
  { value: "off_duty", label: "Tidak Bertugas", color: "slate" },
] as const;

export const ASSIGNMENT_STATUS_OPTIONS = [
  { value: "assigned", label: "Ditugaskan", color: "blue" },
  { value: "in_progress", label: "Sedang Dikerjakan", color: "amber" },
  { value: "completed", label: "Selesai", color: "emerald" },
  { value: "cancelled", label: "Dibatalkan", color: "red" },
] as const;

export const ASSIGNMENT_ROLE_OPTIONS = [
  { value: "lead", label: "Teknisi Utama" },
  { value: "assistant", label: "Asisten" },
  { value: "technician", label: "Teknisi" },
] as const;

// ============================================
// TYPE GUARDS
// ============================================

export function isEmployee(obj: any): obj is Employee {
  return (
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.email === "string" &&
    ["available", "on_job", "locked", "off_duty"].includes(obj.status)
  );
}

export function isServiceAssignment(obj: any): obj is ServiceAssignment {
  return (
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    typeof obj.invoice_id === "string" &&
    typeof obj.technician_id === "string"
  );
}

export default {
  EMPLOYEE_STATUS_OPTIONS,
  ASSIGNMENT_STATUS_OPTIONS,
  ASSIGNMENT_ROLE_OPTIONS,
  isEmployee,
  isServiceAssignment,
};

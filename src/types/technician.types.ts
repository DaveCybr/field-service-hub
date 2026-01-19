/**
 * ============================================
 * FILE: 04_technician.types.ts
 * LOCATION: src/types/technician.types.ts
 * DESCRIPTION: TypeScript interfaces untuk Technician Module
 * ============================================
 */

/**
 * CARA PAKAI:
 *
 * 1. Copy file ini ke: src/types/technician.types.ts
 * 2. Import di component: import type { Technician } from '@/types/technician.types';
 * 3. Use untuk type safety: const tech: Technician = { ... };
 */

// ============================================
// BASE TYPES
// ============================================

/**
 * Status ketersediaan teknisi
 * - available: Siap menerima tugas baru
 * - busy: Sedang ada tugas aktif
 * - off_duty: Tidak bertugas (cuti, libur, dll)
 */
export type TechnicianStatus = "available" | "busy" | "off_duty";

/**
 * Status penugasan
 * - assigned: Baru ditugaskan, belum mulai
 * - in_progress: Sedang dikerjakan
 * - completed: Sudah selesai
 * - cancelled: Dibatalkan
 */
export type AssignmentStatus =
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

/**
 * Jenis aktivitas GPS tracking
 * - check_in: Saat teknisi sampai lokasi (mulai kerja)
 * - check_out: Saat teknisi selesai dan meninggalkan lokasi
 * - update: Update lokasi berkala saat kerja
 */
export type LocationActivityType = "check_in" | "check_out" | "update";

/**
 * Jenis foto dokumentasi
 * - before: Foto kondisi sebelum dikerjakan
 * - progress: Foto progress saat sedang dikerjakan
 * - after: Foto hasil akhir setelah selesai
 * - damage: Foto kerusakan yang ditemukan
 * - other: Foto lain-lain
 */
export type PhotoType = "before" | "progress" | "after" | "damage" | "other";

// ============================================
// MAIN INTERFACES
// ============================================

/**
 * Interface: Technician
 * Table: technicians
 * Description: Data teknisi/staff lapangan
 */
export interface Technician {
  /** UUID primary key */
  id: string;

  /** Foreign key ke auth.users (Supabase Auth) */
  user_id: string;

  /** Nama lengkap teknisi */
  name: string;

  /** Email address (unique) */
  email: string;

  /** Nomor telepon/WhatsApp */
  phone: string;

  /**
   * Array spesialisasi teknisi
   * Contoh: ['AC', 'Kulkas', 'Mesin Cuci']
   */
  specialization: string[];

  /** Status ketersediaan teknisi */
  status: TechnicianStatus;

  /**
   * Lokasi terakhir teknisi (optional)
   * Diupdate saat check-in atau tracking aktif
   */
  current_location?: {
    latitude: number;
    longitude: number;
    updated_at: string; // ISO datetime string
  };

  /** URL foto profile (optional) */
  avatar_url?: string;

  /** Timestamp dibuat */
  created_at: string;

  /** Timestamp terakhir diupdate */
  updated_at: string;
}

/**
 * Interface: TechnicianAssignment
 * Table: technician_assignments
 * Description: Penugasan teknisi ke invoice/pekerjaan
 */
export interface TechnicianAssignment {
  /** UUID primary key */
  id: string;

  /** Foreign key ke table invoices */
  invoice_id: string;

  /** Foreign key ke table technicians */
  technician_id: string;

  /** Timestamp saat ditugaskan */
  assigned_at: string;

  /** Timestamp saat mulai kerja (optional, set saat check-in) */
  started_at?: string;

  /** Timestamp saat selesai (optional, set saat complete) */
  completed_at?: string;

  /** Status penugasan */
  status: AssignmentStatus;

  /** Catatan dari teknisi atau admin (optional) */
  notes?: string;

  /** Timestamp dibuat */
  created_at: string;

  /** Timestamp terakhir diupdate */
  updated_at: string;
}

/**
 * Interface: LocationLog
 * Table: location_logs
 * Description: History tracking lokasi teknisi
 */
export interface LocationLog {
  /** UUID primary key */
  id: string;

  /** Foreign key ke technician_assignments */
  assignment_id: string;

  /** Koordinat GPS - Latitude */
  latitude: number;

  /** Koordinat GPS - Longitude */
  longitude: number;

  /** Akurasi GPS dalam meter (optional) */
  accuracy?: number;

  /** Jenis aktivitas */
  activity_type: LocationActivityType;

  /** Timestamp saat lokasi direkam */
  recorded_at: string;

  /** Timestamp dibuat di database */
  created_at: string;
}

/**
 * Interface: PhotoLog
 * Table: photo_logs
 * Description: Dokumentasi foto pekerjaan
 */
export interface PhotoLog {
  /** UUID primary key */
  id: string;

  /** Foreign key ke technician_assignments */
  assignment_id: string;

  /** URL foto di Supabase Storage */
  photo_url: string;

  /** Jenis/kategori foto */
  photo_type: PhotoType;

  /** Deskripsi/caption foto (optional) */
  description?: string;

  /**
   * Koordinat GPS saat foto diambil (optional)
   * Berguna untuk verifikasi lokasi
   */
  location?: {
    latitude: number;
    longitude: number;
  };

  /** Timestamp saat foto diupload */
  uploaded_at: string;

  /** Timestamp dibuat di database */
  created_at: string;
}

// ============================================
// EXTENDED INTERFACES (dengan Relations)
// ============================================

/**
 * Interface: TechnicianWithAssignments
 * Description: Technician dengan data assignments
 * Use: Untuk dashboard atau detail teknisi
 */
export interface TechnicianWithAssignments extends Technician {
  /** Array of assignments (optional) */
  assignments?: TechnicianAssignment[];

  /** Jumlah assignment aktif (optional) */
  active_assignments_count?: number;

  /** Statistik teknisi (optional) */
  stats?: {
    total_assignments: number;
    completed_assignments: number;
    cancelled_assignments: number;
    average_completion_time?: number; // in hours
  };
}

/**
 * Interface: AssignmentWithDetails
 * Description: Assignment dengan semua relasi
 * Use: Untuk detail penugasan lengkap
 */
export interface AssignmentWithDetails extends TechnicianAssignment {
  /** Data teknisi yang ditugaskan */
  technician?: Technician;

  /** Data invoice/pekerjaan (partial) */
  invoice?: {
    invoice_number: string;
    customer_name: string;
    customer_phone?: string;
    service_type: string;
    device_info?: string;
    problem_description?: string;
    status: string;
  };

  /** Array history lokasi */
  location_logs?: LocationLog[];

  /** Array foto dokumentasi */
  photo_logs?: PhotoLog[];

  /** Statistik assignment (optional) */
  stats?: {
    total_locations: number;
    total_photos: number;
    distance_traveled?: number; // in km
    duration?: number; // in hours
  };
}

/**
 * Interface: InvoiceWithTechnician
 * Description: Invoice dengan data teknisi (jika sudah assigned)
 * Use: Untuk menampilkan teknisi di invoice list
 */
export interface InvoiceWithTechnician {
  id: string;
  invoice_number: string;
  customer_name: string;
  service_type: string;
  status: string;

  /** Assignment data (optional jika sudah assigned) */
  technician_assignment?: {
    id: string;
    status: AssignmentStatus;
    assigned_at: string;
    technician: Technician;
  };
}

// ============================================
// FORM INPUT TYPES (untuk Create/Update)
// ============================================

/**
 * Type: CreateTechnicianInput
 * Description: Input data untuk create teknisi baru
 * Use: Form create technician
 */
export type CreateTechnicianInput = Omit<
  Technician,
  "id" | "created_at" | "updated_at" | "current_location"
> & {
  user_id?: string; // Optional karena bisa auto-generate
};

/**
 * Type: UpdateTechnicianInput
 * Description: Input data untuk update teknisi
 * Use: Form edit technician (semua field optional)
 */
export type UpdateTechnicianInput = Partial<
  Omit<Technician, "id" | "created_at" | "updated_at">
>;

/**
 * Type: CreateAssignmentInput
 * Description: Input data untuk assign teknisi ke invoice
 * Use: Form assign technician
 */
export type CreateAssignmentInput = {
  invoice_id: string;
  technician_id: string;
  notes?: string;
  status?: AssignmentStatus; // Default: 'assigned'
};

/**
 * Type: UpdateAssignmentInput
 * Description: Input data untuk update assignment
 * Use: Update status atau notes
 */
export type UpdateAssignmentInput = {
  status?: AssignmentStatus;
  notes?: string;
  started_at?: string;
  completed_at?: string;
};

/**
 * Type: LogLocationInput
 * Description: Input data untuk log lokasi
 * Use: Saat check-in, check-out, atau update lokasi
 */
export type LogLocationInput = {
  assignment_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  activity_type: LocationActivityType;
};

/**
 * Type: UploadPhotoInput
 * Description: Input data untuk upload foto
 * Use: Form upload documentation photo
 */
export type UploadPhotoInput = {
  assignment_id: string;
  file: File;
  photo_type: PhotoType;
  description?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
};

// ============================================
// FILTER & QUERY TYPES
// ============================================

/**
 * Type: TechnicianFilters
 * Description: Filter untuk query teknisi
 * Use: Search & filter di technician list
 */
export type TechnicianFilters = {
  status?: TechnicianStatus | "all";
  specialization?: string;
  search?: string; // Search by name or email
};

/**
 * Type: AssignmentFilters
 * Description: Filter untuk query assignments
 * Use: Filter di assignment dashboard
 */
export type AssignmentFilters = {
  status?: AssignmentStatus | "all";
  technician_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string; // Search by invoice number or customer
};

// ============================================
// RESPONSE TYPES (dari API)
// ============================================

/**
 * Type: ApiResponse
 * Description: Standard API response wrapper
 */
export type ApiResponse<T> = {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  success: boolean;
};

/**
 * Type: PaginatedResponse
 * Description: Response dengan pagination
 */
export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
};

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Type: Coordinates
 * Description: GPS coordinates
 */
export type Coordinates = {
  latitude: number;
  longitude: number;
};

/**
 * Type: DateRange
 * Description: Range tanggal untuk filter
 */
export type DateRange = {
  start: string | Date;
  end: string | Date;
};

/**
 * Type: StatusBadgeColor
 * Description: Color mapping untuk status badges
 */
export type StatusBadgeColor = {
  background: string;
  text: string;
  label: string;
};

// ============================================
// CONSTANTS (bisa dipakai sebagai enum)
// ============================================

/**
 * Constant: TECHNICIAN_STATUS_OPTIONS
 * Description: Options untuk dropdown status teknisi
 */
export const TECHNICIAN_STATUS_OPTIONS = [
  { value: "available", label: "Available", color: "green" },
  { value: "busy", label: "Busy", color: "yellow" },
  { value: "off_duty", label: "Off Duty", color: "gray" },
] as const;

/**
 * Constant: ASSIGNMENT_STATUS_OPTIONS
 * Description: Options untuk dropdown status assignment
 */
export const ASSIGNMENT_STATUS_OPTIONS = [
  { value: "assigned", label: "Ditugaskan", color: "blue" },
  { value: "in_progress", label: "Sedang Dikerjakan", color: "yellow" },
  { value: "completed", label: "Selesai", color: "green" },
  { value: "cancelled", label: "Dibatalkan", color: "red" },
] as const;

/**
 * Constant: PHOTO_TYPE_OPTIONS
 * Description: Options untuk dropdown jenis foto
 */
export const PHOTO_TYPE_OPTIONS = [
  { value: "before", label: "Sebelum Dikerjakan", icon: "📸" },
  { value: "progress", label: "Progress Pekerjaan", icon: "🔧" },
  { value: "after", label: "Hasil Akhir", icon: "✅" },
  { value: "damage", label: "Kerusakan", icon: "⚠️" },
  { value: "other", label: "Lain-lain", icon: "📷" },
] as const;

/**
 * Constant: ACTIVITY_TYPE_OPTIONS
 * Description: Options untuk jenis aktivitas lokasi
 */
export const ACTIVITY_TYPE_OPTIONS = [
  { value: "check_in", label: "Check In", icon: "📍" },
  { value: "check_out", label: "Check Out", icon: "🏁" },
  { value: "update", label: "Update Lokasi", icon: "🔄" },
] as const;

// ============================================
// TYPE GUARDS (untuk runtime type checking)
// ============================================

/**
 * Type Guard: isTechnician
 * Check if object is Technician type
 */
export function isTechnician(obj: any): obj is Technician {
  return (
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.email === "string" &&
    ["available", "busy", "off_duty"].includes(obj.status)
  );
}

/**
 * Type Guard: isAssignment
 * Check if object is TechnicianAssignment type
 */
export function isAssignment(obj: any): obj is TechnicianAssignment {
  return (
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    typeof obj.invoice_id === "string" &&
    typeof obj.technician_id === "string" &&
    ["assigned", "in_progress", "completed", "cancelled"].includes(obj.status)
  );
}

// ============================================
// USAGE EXAMPLES
// ============================================

/**
 * Example 1: Using Technician type
 *
 * ```typescript
 * const technician: Technician = {
 *   id: '123',
 *   user_id: '456',
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   phone: '081234567890',
 *   specialization: ['AC', 'Kulkas'],
 *   status: 'available',
 *   created_at: new Date().toISOString(),
 *   updated_at: new Date().toISOString()
 * };
 * ```
 */

/**
 * Example 2: Using CreateTechnicianInput
 *
 * ```typescript
 * const newTechData: CreateTechnicianInput = {
 *   name: 'Jane Doe',
 *   email: 'jane@example.com',
 *   phone: '081234567891',
 *   specialization: ['Mesin Cuci'],
 *   status: 'available'
 * };
 *
 * const result = await technicianService.create(newTechData);
 * ```
 */

/**
 * Example 3: Using filters
 *
 * ```typescript
 * const filters: TechnicianFilters = {
 *   status: 'available',
 *   specialization: 'AC',
 *   search: 'john'
 * };
 *
 * const technicians = await getTechnicians(filters);
 * ```
 */

/**
 * Example 4: Type with relations
 *
 * ```typescript
 * const assignment: AssignmentWithDetails = {
 *   id: '789',
 *   invoice_id: '101',
 *   technician_id: '123',
 *   status: 'in_progress',
 *   assigned_at: new Date().toISOString(),
 *   started_at: new Date().toISOString(),
 *   created_at: new Date().toISOString(),
 *   updated_at: new Date().toISOString(),
 *   technician: technician,
 *   invoice: {
 *     invoice_number: 'INV-001',
 *     customer_name: 'Customer A',
 *     service_type: 'Perbaikan AC'
 *   },
 *   location_logs: [],
 *   photo_logs: []
 * };
 * ```
 */

// ============================================
// EXPORT ALL
// ============================================

export default {
  TECHNICIAN_STATUS_OPTIONS,
  ASSIGNMENT_STATUS_OPTIONS,
  PHOTO_TYPE_OPTIONS,
  ACTIVITY_TYPE_OPTIONS,
  isTechnician,
  isAssignment,
};
